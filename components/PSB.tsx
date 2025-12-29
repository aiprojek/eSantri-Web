
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { Pendaftar, PsbConfig, PondokSettings, Santri, PsbDesignStyle, PsbCustomField, PsbFieldType, PsbFormTemplate, RiwayatStatus } from '../types';
import { db } from '../db';
import { PrintHeader } from './common/PrintHeader';
import { PendaftarModal } from './psb/modals/PendaftarModal';
import { BulkPendaftarEditor } from './psb/modals/BulkPendaftarEditor';
import { fetchPsbFromDropbox } from '../services/syncService';
import { getSupabaseClient } from '../services/supabaseClient';
import { generatePosterPrompt } from '../services/aiService';

// --- Sub-components for PSB ---

const PsbDashboard: React.FC<{ pendaftarList: Pendaftar[], config: PsbConfig, settings: PondokSettings }> = ({ pendaftarList, config, settings }) => {
    const totalPendaftar = pendaftarList.length;
    
    const statsByJenjang = useMemo(() => {
        return settings.jenjang.map(j => {
            const pendaftarInJenjang = pendaftarList.filter(p => p.jenjangId === j.id);
            const l = pendaftarInJenjang.filter(p => p.jenisKelamin === 'Laki-laki').length;
            const p = pendaftarInJenjang.filter(p => p.jenisKelamin === 'Perempuan').length;
            const total = pendaftarInJenjang.length;
            return { 
                id: j.id, 
                name: j.nama, 
                total, 
                l, 
                p, 
                percentL: total > 0 ? (l / total) * 100 : 0,
                percentP: total > 0 ? (p / total) * 100 : 0
            };
        });
    }, [settings.jenjang, pendaftarList]);

    const dailyTrend = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = pendaftarList.filter(p => p.tanggalDaftar.startsWith(dateStr)).length;
            days.push({ date: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }), count });
        }
        return days;
    }, [pendaftarList]);

    const maxDaily = Math.max(...dailyTrend.map(d => d.count), 1);

    const statusStats = useMemo(() => {
        const counts = { Baru: 0, Diterima: 0, Cadangan: 0, Ditolak: 0 };
        pendaftarList.forEach(p => {
            if (counts[p.status] !== undefined) counts[p.status]++;
        });
        return counts;
    }, [pendaftarList]);

    const todayStr = new Date().toISOString().split('T')[0];
    const pendaftarHariIni = pendaftarList.filter(p => p.tanggalDaftar.startsWith(todayStr)).length;

    const handlePrint = () => { window.print(); };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 no-print">
                <h2 className="text-xl font-bold text-gray-700">Analitik Pendaftaran Santri Baru</h2>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors">
                    <i className="bi bi-printer-fill"></i> Cetak Laporan
                </button>
            </div>
            <div className="hidden print:block mb-8">
                <PrintHeader settings={settings} title="LAPORAN DASHBOARD PENERIMAAN SANTRI BARU" />
                <p className="text-center text-sm">Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-teal-500">
                    <p className="text-gray-500 text-sm font-medium">Total Pendaftar</p>
                    <p className="text-3xl font-bold text-gray-800">{totalPendaftar}</p>
                    <p className="text-xs text-gray-400 mt-1">Tahun Ajaran {config.tahunAjaranAktif}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-500">
                    <p className="text-gray-500 text-sm font-medium">Pendaftar Hari Ini</p>
                    <p className="text-3xl font-bold text-gray-800">{pendaftarHariIni}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString('id-ID')}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-green-500">
                    <p className="text-gray-500 text-sm font-medium">Sudah Diterima</p>
                    <p className="text-3xl font-bold text-gray-800">{statusStats.Diterima}</p>
                    <p className="text-xs text-gray-400 mt-1">Santri Lolos Seleksi</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md" style={{ breakInside: 'avoid' }}>
                <h3 className="text-lg font-bold text-gray-700 mb-6 border-b pb-2">Jumlah Pendaftar per Jenjang</h3>
                <div className="space-y-6">
                    {statsByJenjang.map((jenjang) => (
                        <div key={jenjang.id}>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <span className="text-base font-semibold text-gray-800">{jenjang.name}</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900">{jenjang.total} <span className="text-sm font-normal text-gray-500">Pendaftar</span></span>
                            </div>
                            <div className="w-full h-6 flex rounded-full overflow-hidden bg-gray-100">
                                {jenjang.total > 0 ? (
                                    <>
                                        <div className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `${jenjang.percentL}%` }} title={`Laki-laki: ${jenjang.l}`}>{jenjang.percentL > 10 && `${Math.round(jenjang.percentL)}%`}</div>
                                        <div className="bg-pink-500 h-full flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `${jenjang.percentP}%` }} title={`Perempuan: ${jenjang.p}`}>{jenjang.percentP > 10 && `${Math.round(jenjang.percentP)}%`}</div>
                                    </>
                                ) : (<div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">Belum ada data</div>)}
                            </div>
                            <div className="flex justify-between mt-2 text-sm">
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-gray-600">Putra: <strong>{jenjang.l}</strong></span></div>
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500"></span><span className="text-gray-600">Putri: <strong>{jenjang.p}</strong></span></div>
                            </div>
                        </div>
                    ))}
                    {statsByJenjang.length === 0 && <p className="text-center text-gray-500 italic">Belum ada jenjang yang dikonfigurasi.</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ breakInside: 'avoid' }}>
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">Tren Pendaftaran (7 Hari Terakhir)</h3>
                    <div className="h-48 flex items-end justify-between gap-2 pt-4">
                        {dailyTrend.map((d, idx) => (
                            <div key={idx} className="flex flex-col items-center w-full group">
                                <div className="relative w-full flex justify-center"><div className="w-4/5 bg-teal-500 rounded-t-md hover:bg-teal-600 transition-all" style={{ height: `${d.count > 0 ? (d.count / maxDaily) * 150 : 2}px` }}></div><div className="absolute -top-6 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</div></div>
                                <span className="text-[10px] text-gray-500 mt-2 text-center leading-tight">{d.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">Status Seleksi</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500"><span className="font-medium text-gray-700">Baru (Belum Diseleksi)</span><span className="font-bold text-gray-900">{statusStats.Baru}</span></div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-l-4 border-green-500"><span className="font-medium text-green-800">Diterima</span><span className="font-bold text-green-900">{statusStats.Diterima}</span></div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500"><span className="font-medium text-yellow-800">Cadangan</span><span className="font-bold text-yellow-900">{statusStats.Cadangan}</span></div>
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-l-4 border-red-500"><span className="font-medium text-red-800">Ditolak / Batal</span><span className="font-bold text-red-900">{statusStats.Ditolak}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PsbPosterMaker: React.FC<{ settings: PondokSettings }> = ({ settings }) => {
    const { showToast } = useAppContext();
    const [style, setStyle] = useState<PsbDesignStyle>('modern');
    const [ratio, setRatio] = useState<string>('9:16');
    const [details, setDetails] = useState<string>('');
    const [customInfo, setCustomInfo] = useState<string>('');
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const infoString = customInfo.trim() || `Nama Pondok: ${settings.namaPonpes}`;
            const prompt = await generatePosterPrompt(style, ratio, details, infoString);
            setGeneratedPrompt(prompt);
            showToast("Prompt berhasil dibuat! Silakan salin.", "success");
        } catch (error) {
            showToast("Gagal membuat prompt. Pastikan koneksi internet lancar.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedPrompt) return;
        navigator.clipboard.writeText(generatedPrompt);
        showToast("Prompt disalin ke clipboard!", "success");
    };

    const ratioOptions = [
        { val: '9:16', label: 'Story/TikTok', icon: 'bi-phone' },
        { val: '1:1', label: 'Square/IG', icon: 'bi-square' },
        { val: '16:9', label: 'Landscape', icon: 'bi-display' },
        { val: 'A4 Portrait', label: 'Cetak A4', icon: 'bi-file-earmark' },
        { val: 'A3 Portrait', label: 'Cetak A3', icon: 'bi-file-earmark-text' },
        { val: 'F4/Folio Portrait', label: 'Cetak F4', icon: 'bi-file-earmark-richtext' }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            <div className="bg-white p-6 rounded-lg shadow-md overflow-y-auto">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <i className="bi bi-stars text-xl"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Poster Prompt Maker</h2>
                        <p className="text-xs text-gray-500">Buat prompt untuk AI Image Generator (Midjourney/DALL-E) secara Gratis.</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gaya Desain Poster</label>
                        <select 
                            value={style} 
                            onChange={(e) => setStyle(e.target.value as PsbDesignStyle)} 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="classic">Klasik Tradisional (Islami & Elegan)</option>
                            <option value="modern">Modern Tech (Minimalis & Bersih)</option>
                            <option value="bold">Bold (Tegas & Kontras Tinggi)</option>
                            <option value="dark">Premium Dark (Eksklusif & Sinematik)</option>
                            <option value="ceria">Ceria (Warna-warni untuk TPQ/Anak)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rasio Ukuran</label>
                        <div className="grid grid-cols-3 gap-3">
                            {ratioOptions.map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => setRatio(opt.val)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${ratio === opt.val ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <i className={`bi ${opt.icon} text-lg mb-1`}></i>
                                    <span className="text-xs font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Informasi Utama (Teks pada Poster)</label>
                        <textarea 
                            value={customInfo}
                            onChange={(e) => setCustomInfo(e.target.value)}
                            rows={3}
                            placeholder="Contoh: Penerimaan Santri Baru 2025/2026, Pondok Pesantren Al-Hikmah. Program Unggulan: Tahfidz & Bahasa Arab. Segera Daftar, Kuota Terbatas!"
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-purple-500 focus:border-purple-500 bg-purple-50/20"
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1">Tuliskan teks apa saja yang ingin ditampilkan dalam desain.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Detail Visual (Opsional)</label>
                        <textarea 
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={2}
                            placeholder="Contoh: Suasana santri sedang mengaji di taman, latar belakang masjid megah, cahaya matahari sore yang hangat..."
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-purple-500 focus:border-purple-500"
                        ></textarea>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
                    >
                        {isLoading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : <i className="bi bi-magic"></i>}
                        Generate Prompt
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col h-full text-white relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                    <i className="bi bi-terminal"></i> Hasil Prompt
                </h3>
                
                <div className="flex-grow bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 border border-gray-700 relative overflow-y-auto custom-scrollbar">
                    {generatedPrompt ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{generatedPrompt}</p>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                            <i className="bi bi-image text-4xl mb-2"></i>
                            <p>Prompt akan muncul di sini...</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end gap-3 relative z-10">
                    <button 
                        onClick={() => setGeneratedPrompt('')}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        disabled={!generatedPrompt}
                    >
                        Reset
                    </button>
                    <button 
                        onClick={copyToClipboard}
                        disabled={!generatedPrompt}
                        className="px-6 py-2 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:bg-gray-600 disabled:text-gray-400"
                    >
                        <i className="bi bi-clipboard"></i> Salin Prompt
                    </button>
                </div>
                
                <div className="mt-4 p-3 bg-gray-700/50 rounded text-xs text-gray-400 border border-gray-600">
                    <p><i className="bi bi-info-circle mr-1"></i> Tips: Salin prompt ini dan tempelkan ke <strong>Midjourney</strong> (/imagine), <strong>Bing Image Creator</strong> (DALL-E 3), atau <strong>Stable Diffusion</strong> untuk membuat gambar.</p>
                </div>
            </div>
        </div>
    );
};

const CustomFieldEditor: React.FC<{ fields: PsbCustomField[], onChange: (fields: PsbCustomField[]) => void }> = ({ fields, onChange }) => {
    const addField = () => {
        const newField: PsbCustomField = {
            id: 'field_' + Date.now(),
            type: 'text',
            label: 'Pertanyaan Baru',
            required: false
        };
        onChange([...fields, newField]);
    };

    const updateField = (index: number, updates: Partial<PsbCustomField>) => {
        const updated = [...fields];
        updated[index] = { ...updated[index], ...updates };
        onChange(updated);
    };

    const removeField = (index: number) => {
        onChange(fields.filter((_, i) => i !== index));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
        const updated = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-3 bg-gray-50 relative group">
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveField(index, 'up')} className="p-1 text-gray-500 hover:text-gray-700" title="Geser Naik"><i className="bi bi-arrow-up"></i></button>
                        <button onClick={() => moveField(index, 'down')} className="p-1 text-gray-500 hover:text-gray-700" title="Geser Turun"><i className="bi bi-arrow-down"></i></button>
                        <button onClick={() => removeField(index)} className="p-1 text-red-500 hover:text-red-700" title="Hapus"><i className="bi bi-trash"></i></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2 pr-20">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Field</label>
                            <select 
                                value={field.type} 
                                onChange={(e) => updateField(index, { type: e.target.value as PsbFieldType })}
                                className="w-full border rounded p-1.5 text-sm"
                            >
                                <option value="text">Teks Singkat</option>
                                <option value="paragraph">Paragraf / Essai</option>
                                <option value="radio">Pilihan Ganda (Radio)</option>
                                <option value="checkbox">Kotak Centang (Checkbox)</option>
                                <option value="file">Unggah Dokumen (PDF/JPG)</option>
                                <option value="section">Judul Bagian (Section)</option>
                                <option value="statement">Pernyataan / Info</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Label / Pertanyaan</label>
                            <input 
                                type="text" 
                                value={field.label} 
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                className="w-full border rounded p-1.5 text-sm"
                            />
                        </div>
                    </div>

                    {(field.type === 'radio' || field.type === 'checkbox') && (
                        <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Opsi Jawaban (pisahkan dengan koma)</label>
                            <input 
                                type="text" 
                                value={field.options?.join(', ') || ''} 
                                onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full border rounded p-1.5 text-sm"
                                placeholder="Contoh: Ya, Tidak, Mungkin"
                            />
                        </div>
                    )}

                    {field.type !== 'section' && field.type !== 'statement' && (
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id={`req-${field.id}`}
                                checked={field.required}
                                onChange={(e) => updateField(index, { required: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded"
                            />
                            <label htmlFor={`req-${field.id}`} className="text-xs text-gray-600">Wajib Diisi</label>
                        </div>
                    )}
                </div>
            ))}
            <button onClick={addField} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-600 text-sm font-medium transition-colors">
                + Tambah Pertanyaan Lain
            </button>
        </div>
    );
};

const PsbRekap: React.FC<{ 
    pendaftarList: Pendaftar[], 
    settings: PondokSettings, 
    onImportFromWA: (text: string) => void,
    onUpdateList: () => void 
}> = ({ pendaftarList, settings, onImportFromWA, onUpdateList }) => {
    const { onBulkAddSantri, showToast, showConfirmation, showAlert } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterJenjang, setFilterJenjang] = useState('');
    const [waInput, setWaInput] = useState('');
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [isPendaftarModalOpen, setIsPendaftarModalOpen] = useState(false);
    const [editingPendaftar, setEditingPendaftar] = useState<Pendaftar | null>(null);
    const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false);

    const filteredData = useMemo(() => {
        return pendaftarList.filter(p => {
            const matchSearch = p.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               (p.nisn && p.nisn.includes(searchTerm));
            const matchJenjang = !filterJenjang || p.jenjangId === parseInt(filterJenjang);
            return matchSearch && matchJenjang;
        });
    }, [pendaftarList, searchTerm, filterJenjang]);

    const handleCloudSync = async () => {
        const config = settings.cloudSyncConfig;
        if (!config || config.provider === 'none') {
            showAlert('Konfigurasi Cloud Belum Aktif', 'Silakan aktifkan Dropbox atau Supabase di menu Pengaturan untuk menggunakan fitur tarik data otomatis.');
            return;
        }

        setIsSyncing(true);
        try {
            let newItems: Omit<Pendaftar, 'id'>[] = [];
            
            if (config.provider === 'dropbox') {
                newItems = await fetchPsbFromDropbox(config.dropboxToken!);
            } else if (config.provider === 'supabase') {
                const client = getSupabaseClient(config);
                if (client) {
                    const { data, error } = await client.from('pendaftar').select('*').eq('status', 'Baru');
                    if (error) throw error;
                    newItems = (data as Pendaftar[]).map(({id, ...rest}) => rest);
                }
            }

            if (newItems.length > 0) {
                await db.pendaftar.bulkAdd(newItems as Pendaftar[]);
                onUpdateList();
                showToast(`${newItems.length} data pendaftar baru ditarik dari Cloud.`, 'success');
            } else {
                showToast('Tidak ada data pendaftaran baru di Cloud.', 'info');
            }
        } catch (e: any) {
            showAlert('Gagal Sinkronisasi', e.message);
        } finally {
            setIsSyncing(false);
        }
    }

    const handleProcessWA = () => {
        if(!waInput.trim()) return;
        onImportFromWA(waInput);
        setWaInput('');
        setIsWaModalOpen(false);
    }

    const handleDelete = (id: number) => {
        showConfirmation('Hapus Pendaftar?', 'Data ini akan dihapus permanen.', async () => {
            await db.pendaftar.delete(id);
            onUpdateList();
            showToast('Pendaftar dihapus', 'success');
        }, { confirmColor: 'red' });
    }

    const handleAccept = (pendaftar: Pendaftar) => {
        showConfirmation('Terima Sebagai Santri?', `Pindahkan ${pendaftar.namaLengkap} ke Database Santri Aktif? Data akan disalin dan status pendaftar akan berubah menjadi "Diterima".`, async () => {
            
            // Initial Status History Entry
            const firstRiwayat: RiwayatStatus = {
                id: Date.now(),
                status: 'Masuk',
                tanggal: new Date().toISOString().split('T')[0],
                keterangan: 'Diterima melalui Jalur Pendaftaran Online (PSB)'
            };

            const newSantri: Omit<Santri, 'id'> = {
                namaLengkap: pendaftar.namaLengkap,
                namaHijrah: pendaftar.namaHijrah,
                nis: '', // Will be generated or filled later by admin
                nisn: pendaftar.nisn,
                nik: pendaftar.nik,
                tempatLahir: pendaftar.tempatLahir,
                tanggalLahir: pendaftar.tanggalLahir,
                jenisKelamin: pendaftar.jenisKelamin,
                kewarganegaraan: (pendaftar.kewarganegaraan as 'WNI' | 'WNA' | 'Keturunan') || 'WNI',
                fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto', // Default Placeholder
                
                // Address Mapping
                alamat: { 
                    detail: pendaftar.alamat, 
                    desaKelurahan: pendaftar.desaKelurahan, 
                    kecamatan: pendaftar.kecamatan, 
                    kabupatenKota: pendaftar.kabupatenKota, 
                    provinsi: pendaftar.provinsi, 
                    kodePos: pendaftar.kodePos 
                },

                // Parent Data Mapping
                namaAyah: pendaftar.namaAyah,
                nikAyah: pendaftar.nikAyah,
                statusAyah: pendaftar.statusAyah,
                pekerjaanAyah: pendaftar.pekerjaanAyah,
                pendidikanAyah: pendaftar.pendidikanAyah,
                penghasilanAyah: pendaftar.penghasilanAyah,
                teleponAyah: pendaftar.teleponAyah,

                namaIbu: pendaftar.namaIbu,
                nikIbu: pendaftar.nikIbu,
                statusIbu: pendaftar.statusIbu,
                pekerjaanIbu: pendaftar.pekerjaanIbu,
                pendidikanIbu: pendaftar.pendidikanIbu,
                penghasilanIbu: pendaftar.penghasilanIbu,
                teleponIbu: pendaftar.teleponIbu,

                namaWali: pendaftar.namaWali,
                teleponWali: pendaftar.nomorHpWali,
                statusWali: pendaftar.hubunganWali,
                statusHidupWali: pendaftar.statusHidupWali,
                pekerjaanWali: pendaftar.pekerjaanWali,
                pendidikanWali: pendaftar.pendidikanWali,
                penghasilanWali: pendaftar.penghasilanWali,

                // Academic & Status
                jenjangId: pendaftar.jenjangId,
                kelasId: 0, // 0 means unassigned
                rombelId: 0, // 0 means unassigned
                status: 'Aktif',
                tanggalMasuk: new Date().toISOString().split('T')[0],
                sekolahAsal: pendaftar.asalSekolah,
                alamatSekolahAsal: pendaftar.alamatSekolahAsal,
                
                // Extra
                statusKeluarga: pendaftar.statusKeluarga,
                anakKe: pendaftar.anakKe,
                jumlahSaudara: pendaftar.jumlahSaudara,
                berkebutuhanKhusus: pendaftar.berkebutuhanKhusus,
                riwayatStatus: [firstRiwayat]
            };
            
            try {
                await onBulkAddSantri([newSantri]);
                await db.pendaftar.update(pendaftar.id, { status: 'Diterima' });
                onUpdateList();
                showToast(`${pendaftar.namaLengkap} berhasil diterima. Silakan atur kelas di menu Data Santri.`, 'success');
            } catch(e) {
                console.error(e);
                showToast('Gagal memindahkan data ke database santri.', 'error');
            }
        }, { confirmColor: 'green', confirmText: 'Ya, Terima Santri' });
    }

    const handleSavePendaftar = async (data: Omit<Pendaftar, 'id'>) => {
        await db.pendaftar.add(data as Pendaftar);
        onUpdateList();
        showToast('Pendaftar berhasil ditambahkan', 'success');
    }

    const handleUpdatePendaftar = async (data: Pendaftar) => {
        await db.pendaftar.put(data);
        onUpdateList();
        showToast('Data pendaftar diperbarui', 'success');
    }

    const handleBulkSave = async (data: Partial<Pendaftar>[]) => {
        const newItems = data.map(d => ({
            ...d,
            status: d.status || 'Baru',
            tanggalDaftar: d.tanggalDaftar || new Date().toISOString(),
            jalurPendaftaran: d.jalurPendaftaran || 'Reguler'
        } as Pendaftar));
        
        await db.pendaftar.bulkAdd(newItems as Pendaftar[]);
        onUpdateList();
        showToast(`${newItems.length} pendaftar ditambahkan.`, 'success');
    }

    const handleOpenDocument = (base64: string) => {
        const win = window.open();
        if (win) {
            win.document.write('<iframe src="' + base64 + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-700">Data Pendaftar</h2>
                        <p className="text-xs text-gray-500">Kelola dan sinkronkan data santri baru.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                        <button 
                            onClick={handleCloudSync} 
                            disabled={isSyncing}
                            className="flex-grow lg:flex-grow-0 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm disabled:bg-blue-400"
                        >
                            {isSyncing ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-cloud-download"></i>}
                            Tarik Data Cloud
                        </button>
                        <button onClick={() => setIsWaModalOpen(true)} className="flex-grow lg:flex-grow-0 bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 flex items-center justify-center gap-2">
                            <i className="bi bi-whatsapp"></i> Impor WA
                        </button>
                        <button onClick={() => { setEditingPendaftar(null); setIsPendaftarModalOpen(true); }} className="flex-grow lg:flex-grow-0 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 flex items-center justify-center gap-2">
                            <i className="bi bi-plus-lg"></i> Tambah
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari nama atau NISN..." className="flex-grow border rounded-lg p-2.5 text-sm"/>
                    <select value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)} className="border rounded-lg p-2.5 text-sm sm:w-48">
                        <option value="">Semua Jenjang</option>
                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                            <tr>
                                <th className="p-3 w-10">No</th>
                                <th className="p-3">Nama Lengkap</th>
                                <th className="p-3">Jenjang</th>
                                <th className="p-3">Wali & Kontak</th>
                                <th className="p-3 text-center">Dokumen</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredData.map((p, idx) => {
                                const customData = p.customData ? JSON.parse(p.customData) : {};
                                const files = Object.keys(customData).filter(key => customData[key]?.startsWith('data:'));
                                
                                return (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center">{idx + 1}</td>
                                        <td className="p-3 font-medium">
                                            {p.namaLengkap}
                                            <div className="text-xs text-gray-500">{new Date(p.tanggalDaftar).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-3">{settings.jenjang.find(j => j.id === p.jenjangId)?.nama || '-'}</td>
                                        <td className="p-3">
                                            <div className="font-medium">{p.namaWali}</div>
                                            <div className="text-xs text-gray-500">{p.nomorHpWali}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {files.length > 0 ? (
                                                <div className="flex flex-wrap justify-center gap-1">
                                                    {files.map(fKey => (
                                                        <button 
                                                            key={fKey}
                                                            onClick={() => handleOpenDocument(customData[fKey])}
                                                            className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 text-[10px] hover:bg-blue-100"
                                                            title="Lihat Dokumen"
                                                        >
                                                            <i className="bi bi-file-earmark-pdf"></i> File
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full ${p.status === 'Baru' ? 'bg-blue-100 text-blue-800' : p.status === 'Diterima' ? 'bg-green-100 text-green-800' : p.status === 'Cadangan' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                {p.status === 'Baru' && (
                                                    <button onClick={() => handleAccept(p)} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Terima sebagai Santri">
                                                        <i className="bi bi-check-lg"></i>
                                                    </button>
                                                )}
                                                <button onClick={() => { setEditingPendaftar(p); setIsPendaftarModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Edit">
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Hapus">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredData.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">Tidak ada data pendaftar.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* WA Import Modal */}
            {isWaModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">Impor Data dari WhatsApp</h3>
                        <p className="text-sm text-gray-600 mb-2">Tempelkan seluruh pesan pendaftaran (termasuk kode <code>PSB_START</code> ... <code>PSB_END</code>) di bawah ini:</p>
                        <textarea 
                            className="w-full border rounded-lg p-3 text-sm h-40 font-mono"
                            value={waInput}
                            onChange={e => setWaInput(e.target.value)}
                            placeholder="Paste pesan di sini..."
                        ></textarea>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsWaModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                            <button onClick={handleProcessWA} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Proses</button>
                        </div>
                    </div>
                </div>
            )}

            <PendaftarModal 
                isOpen={isPendaftarModalOpen}
                onClose={() => setIsPendaftarModalOpen(false)}
                onSave={handleSavePendaftar}
                onUpdate={handleUpdatePendaftar}
                pendaftarData={editingPendaftar}
                settings={settings}
            />

            <BulkPendaftarEditor
                isOpen={isBulkEditorOpen}
                onClose={() => setIsBulkEditorOpen(false)}
                onSave={handleBulkSave}
            />
        </div>
    );
};

const PsbFormBuilder: React.FC<{ config: PsbConfig, settings: PondokSettings, onSave: (c: PsbConfig) => void }> = ({ config, settings, onSave }) => {
    const { showToast, showConfirmation } = useAppContext();
    const [localConfig, setLocalConfig] = useState<PsbConfig>(config);
    const [templateName, setTemplateName] = useState('');
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [newDoc, setNewDoc] = useState('');
    const previewRef = useRef<HTMLDivElement>(null);

    const styles: {id: PsbDesignStyle, label: string}[] = [
        { id: 'classic', label: 'Klasik Tradisional' },
        { id: 'modern', label: 'Modern Tech' },
        { id: 'bold', label: 'Bold & Clean' },
        { id: 'dark', label: 'Premium Dark' },
        { id: 'ceria', label: 'Ceria (TPQ/TK)' }
    ];
    
    const fieldGroups = [
        {
            title: 'Identitas',
            fields: [
                { key: 'namaLengkap', label: 'Nama Lengkap (Sesuai Ijazah)' },
                { key: 'namaHijrah', label: 'Nama Panggilan' },
                { key: 'nisn', label: 'NISN' },
                { key: 'nik', label: 'NIK' },
                { key: 'jenisKelamin', label: 'Jenis Kelamin' },
                { key: 'tempatLahir', label: 'Tempat Lahir' },
                { key: 'tanggalLahir', label: 'Tanggal Lahir' },
                { key: 'kewarganegaraan', label: 'Kewarganegaraan' },
                { key: 'statusKeluarga', label: 'Status dalam Keluarga' },
                { key: 'anakKe', label: 'Anak Ke' },
                { key: 'jumlahSaudara', label: 'Jumlah Saudara' },
            ]
        },
        {
            title: 'Alamat & Kontak',
            fields: [
                { key: 'alamat', label: 'Jalan / Detail' },
                { key: 'desaKelurahan', label: 'Desa / Kelurahan' },
                { key: 'kecamatan', label: 'Kecamatan' },
                { key: 'kabupatenKota', label: 'Kabupaten / Kota' },
                { key: 'provinsi', label: 'Provinsi' },
                { key: 'kodePos', label: 'Kode Pos' },
            ]
        },
        {
            title: 'Data Ayah',
            fields: [
                { key: 'namaAyah', label: 'Nama Ayah' },
                { key: 'nikAyah', label: 'NIK Ayah' },
                { key: 'statusAyah', label: 'Status Ayah (Hidup/Meninggal)' },
                { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah' },
                { key: 'pendidikanAyah', label: 'Pendidikan Ayah' },
                { key: 'penghasilanAyah', label: 'Penghasilan Ayah' },
                { key: 'teleponAyah', label: 'No. HP Ayah' },
            ]
        },
        {
            title: 'Data Ibu',
            fields: [
                { key: 'namaIbu', label: 'Nama Ibu' },
                { key: 'nikIbu', label: 'NIK Ibu' },
                { key: 'statusIbu', label: 'Status Ibu (Hidup/Meninggal)' },
                { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu' },
                { key: 'pendidikanIbu', label: 'Pendidikan Ibu' },
                { key: 'penghasilanIbu', label: 'Penghasilan Ibu' },
                { key: 'teleponIbu', label: 'No. HP Ibu' },
            ]
        },
        {
            title: 'Data Wali & Sekolah',
            fields: [
                { key: 'namaWali', label: 'Nama Wali' },
                { key: 'nomorHpWali', label: 'No. HP / WhatsApp (Wali)' },
                { key: 'hubunganWali', label: 'Hubungan Wali' },
                { key: 'asalSekolah', label: 'Asal Sekolah' },
                { key: 'alamatSekolahAsal', label: 'Alamat Sekolah Asal' },
            ]
        },
    ];

    const toggleField = (key: string) => {
        const current = localConfig.activeFields;
        const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
        setLocalConfig({ ...localConfig, activeFields: next });
    };

    const addDocument = () => {
        if (!newDoc.trim()) return;
        setLocalConfig({ ...localConfig, requiredDocuments: [...localConfig.requiredDocuments, newDoc.trim()] });
        setNewDoc('');
    };

    const removeDocument = (index: number) => {
        const updated = localConfig.requiredDocuments.filter((_, i) => i !== index);
        setLocalConfig({ ...localConfig, requiredDocuments: updated });
    };

    const handleSaveTemplate = () => {
        if (!templateName.trim()) {
            showToast('Nama formulir/template tidak boleh kosong.', 'error');
            return;
        }

        const isNew = !activeTemplateId;
        const newTemplate: PsbFormTemplate = {
            id: activeTemplateId || 'tpl_' + Date.now(),
            name: templateName.trim(),
            targetJenjangId: localConfig.targetJenjangId,
            designStyle: localConfig.designStyle,
            activeFields: localConfig.activeFields,
            requiredDocuments: localConfig.requiredDocuments,
            customFields: localConfig.customFields,
        };

        let updatedTemplates;
        if (isNew) {
            updatedTemplates = [...(localConfig.templates || []), newTemplate];
            setActiveTemplateId(newTemplate.id);
        } else {
            updatedTemplates = (localConfig.templates || []).map(t => t.id === activeTemplateId ? newTemplate : t);
        }

        const newConfig = { ...localConfig, templates: updatedTemplates };
        setLocalConfig(newConfig);
        onSave(newConfig); 
        showToast(isNew ? 'Template baru disimpan.' : 'Perubahan template disimpan.', 'success');
    };

    const handleLoadTemplate = (templateId: string) => {
        const tpl = localConfig.templates?.find(t => t.id === templateId);
        if (tpl) {
            showConfirmation('Muat Formulir?', `Konfigurasi saat ini akan ditimpa dengan data dari "${tpl.name}".`, () => {
                setLocalConfig(prev => ({
                    ...prev,
                    targetJenjangId: tpl.targetJenjangId,
                    designStyle: tpl.designStyle || prev.designStyle,
                    activeFields: [...tpl.activeFields],
                    requiredDocuments: [...tpl.requiredDocuments],
                    customFields: [...tpl.customFields],
                    templates: prev.templates
                }));
                setTemplateName(tpl.name);
                setActiveTemplateId(tpl.id);
                showToast(`Formulir "${tpl.name}" dimuat.`, 'success');
            }, { confirmColor: 'blue', confirmText: 'Ya, Muat' });
        }
    };

    const handleDeleteTemplate = (templateId: string) => {
        const tplName = localConfig.templates?.find(t => t.id === templateId)?.name;
        showConfirmation('Hapus Formulir?', `Hapus arsip "${tplName}"?`, () => {
            const updatedTemplates = (localConfig.templates || []).filter(t => t.id !== templateId);
            const newConfig = { ...localConfig, templates: updatedTemplates };
            setLocalConfig(newConfig);
            onSave(newConfig);
            if (activeTemplateId === templateId) {
                setActiveTemplateId(null);
                setTemplateName('');
            }
        }, { confirmColor: 'red' });
    };

    const handleResetForm = () => {
        showConfirmation('Buat Baru?', 'Semua pengaturan field, dokumen, dan pertanyaan tambahan akan direset ke default.', () => {
            setLocalConfig(prev => ({
                ...prev,
                activeFields: ['namaLengkap', 'nisn', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 'alamat', 'namaWali', 'nomorHpWali', 'asalSekolah'],
                requiredDocuments: ['Kartu Keluarga (KK)', 'Akte Kelahiran', 'Pas Foto 3x4'],
                customFields: [],
                templates: prev.templates
            }));
            setTemplateName('');
            setActiveTemplateId(null);
            showToast('Formulir direset.', 'info');
        }, { confirmColor: 'red' });
    };

    const generateHtml = () => {
        const style = localConfig.designStyle || 'classic';
        const targetJenjang = settings.jenjang.find((j) => j.id === localConfig.targetJenjangId);
        const jenjangName = targetJenjang ? targetJenjang.nama : 'Umum / Belum Dipilih';
        
        const cloudProvider = settings.cloudSyncConfig.provider;
        const dropboxToken = settings.cloudSyncConfig.dropboxToken;
        const supabaseUrl = settings.cloudSyncConfig.supabaseUrl;
        const supabaseKey = settings.cloudSyncConfig.supabaseKey;

        // Helper to generate inputs based on theme
        const renderInput = (label: string, name: string, type: string = 'text', placeholder: string = '', required: boolean = false) => {
            const commonPrint = `border-none border-b border-gray-400 bg-transparent rounded-none px-0`;
            const reqStar = required ? '<span class="text-red-500">*</span>' : '';

            if (type === 'file') {
                return `
                <div class="mb-4 break-inside-avoid">
                    <label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${label} ${reqStar}</label>
                    <div class="flex flex-col gap-2">
                        <input type="file" name="${name}" accept=".pdf,.jpg,.jpeg,.png" ${required ? 'required' : ''} onchange="handleFile(this)" class="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100">
                        <p class="text-[10px] text-gray-500 leading-tight">Maksimal 500KB. Gunakan <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" class="text-blue-500 underline">iLovePDF</a> jika file terlalu besar.</p>
                    </div>
                </div>`;
            }

            if (type === 'date') {
                 if (style === 'classic') {
                    return `
                    <div class="mb-4 break-inside-avoid">
                        <label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${label} ${reqStar}</label>
                        <input type="date" name="${name}" ${required ? 'required' : ''} class="screen-only w-full border-b-2 border-gray-300 focus:border-[#1B4D3E] outline-none py-2 bg-transparent transition placeholder-gray-400">
                        <div class="print-only border-b border-black py-2 text-gray-400 text-sm">tgl ........ / bln ........ / thn ............</div>
                    </div>`;
                } else if (style === 'modern') {
                    return `
                    <div class="mb-4 break-inside-avoid">
                        <label class="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 print:text-black">${label} ${reqStar}</label>
                        <input type="date" name="${name}" ${required ? 'required' : ''} class="screen-only w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none">
                        <div class="print-only border-b border-gray-400 py-2 text-gray-400 text-sm">tgl ........ / bln ........ / thn ............</div>
                    </div>`;
                } else if (style === 'bold') {
                    return `
                    <div class="mb-4 border-b border-gray-100 pb-2 break-inside-avoid">
                        <label class="font-bold text-gray-700 block mb-1 print:text-black">${label} ${reqStar}</label>
                        <input type="date" name="${name}" ${required ? 'required' : ''} class="screen-only w-full bg-gray-50 border-0 border-b-2 border-gray-300 focus:border-red-600 focus:bg-white px-2 py-2 transition outline-none">
                        <div class="print-only border-b border-black py-2 text-gray-400 text-sm">tgl ........ / bln ........ / thn ............</div>
                    </div>`;
                } else if (style === 'dark') {
                    return `
                    <div class="mb-6 group break-inside-avoid">
                        <label class="block text-xs text-amber-500 uppercase tracking-widest mb-2 group-focus-within:text-white transition print:text-black">${label} ${reqStar}</label>
                        <input type="date" name="${name}" ${required ? 'required' : ''} class="screen-only w-full bg-slate-800 border-b border-slate-600 focus:border-amber-500 px-0 py-3 text-white outline-none transition">
                        <div class="print-only border-b border-gray-400 py-2 text-gray-400 text-sm">tgl ........ / bln ........ / thn ............</div>
                    </div>`;
                } else { // ceria
                     return `
                     <div class="mb-4 break-inside-avoid">
                        <label class="block text-gray-500 text-xs font-bold uppercase mb-1 ml-1 print:text-black">${label} ${reqStar}</label>
                        <input type="date" name="${name}" ${required ? 'required' : ''} class="screen-only w-full bg-orange-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-300 outline-none font-bold text-gray-700">
                        <div class="print-only border-b border-gray-400 py-2 text-gray-400 text-sm">tgl ........ / bln ........ / thn ............</div>
                     </div>`;
                }
            }

            if (style === 'classic') {
                return `
                <div class="mb-4 break-inside-avoid">
                    <label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full border-b-2 border-gray-300 focus:border-[#1B4D3E] outline-none py-2 bg-transparent transition placeholder-gray-400 print:${commonPrint} print:border-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'modern') {
                return `
                <div class="mb-4 break-inside-avoid">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none placeholder-gray-400 print:${commonPrint} print:text-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'bold') {
                return `
                <div class="mb-4 border-b border-gray-100 pb-2 break-inside-avoid">
                    <label class="font-bold text-gray-700 block mb-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full bg-gray-50 border-0 border-b-2 border-gray-300 focus:border-red-600 focus:bg-white px-2 py-2 transition outline-none placeholder-gray-400 print:${commonPrint} print:text-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'dark') {
                return `
                <div class="mb-6 group break-inside-avoid">
                    <label class="block text-xs text-amber-500 uppercase tracking-widest mb-2 group-focus-within:text-white transition print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full bg-slate-800 border-b border-slate-600 focus:border-amber-500 px-0 py-3 text-white outline-none transition placeholder-slate-600 print:bg-white print:text-black print:border-gray-400" placeholder="${placeholder}">
                </div>`;
            } else { // ceria
                 return `
                 <div class="mb-4 break-inside-avoid">
                    <label class="block text-gray-500 text-xs font-bold uppercase mb-1 ml-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full bg-orange-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-300 outline-none font-bold text-gray-700 placeholder-gray-400 print:bg-white print:border-b print:border-gray-400 print:rounded-none print:text-black" placeholder="${placeholder}">
                 </div>`;
            }
        };

        const activeFieldsHtml = fieldGroups.flatMap(group => {
            const groupFields = group.fields.filter(f => localConfig.activeFields.includes(f.key));
            if (groupFields.length === 0) return [];
            
            let header = '';
            if (style === 'classic') header = `<h3 class="bg-[#1B4D3E] text-[#D4AF37] px-4 py-2 font-bold uppercase text-sm mb-4 inline-block rounded-r-full break-after-avoid print:bg-gray-200 print:text-black print:border print:border-black">${group.title}</h3>`;
            else if (style === 'modern') header = `<h3 class="text-blue-600 font-bold text-lg mb-4 flex items-center gap-2 border-b pb-1 break-after-avoid print:text-black print:border-black"><span class="bg-blue-100 p-1.5 rounded text-sm print:hidden"><i class="fas fa-caret-right"></i></span> ${group.title}</h3>`;
            else if (style === 'bold') header = `<h3 class="text-xl font-bold text-gray-800 border-l-4 border-red-700 pl-3 mb-4 break-after-avoid print:text-black print:border-black">${group.title}</h3>`;
            else if (style === 'dark') header = `<h3 class="text-white font-serif text-xl border-b border-slate-700 pb-2 mb-4 print:text-black print:border-gray-400 break-after-avoid">${group.title}</h3>`;
            else if (style === 'ceria') header = `<div class="flex items-center gap-3 mb-4 break-after-avoid"><div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-lg print:hidden"><i class="fas fa-star"></i></div><h3 class="font-bold text-gray-700 text-lg print:text-black">${group.title}</h3></div>`;

            const fieldsHtml = groupFields.map(f => {
                if (f.key === 'jenisKelamin') {
                     return `
                     <div class="mb-4 break-inside-avoid">
                        <label class="${style==='modern'?'text-xs font-bold text-gray-500 uppercase tracking-wide':'block text-gray-600 text-sm font-bold mb-1'} print:text-black">Jenis Kelamin</label>
                        <div class="flex gap-4 mt-1">
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="jenisKelamin" value="Laki-laki" required class="accent-teal-600"> Laki-laki</label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="jenisKelamin" value="Perempuan" required class="accent-teal-600"> Perempuan</label>
                        </div>
                     </div>`;
                }
                return renderInput(f.label, f.key, f.key.toLowerCase().includes('tanggal') ? 'date' : 'text', '', true);
            }).join('');

            return [`<section class="mb-8 break-inside-avoid">${header}<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${fieldsHtml}</div></section>`];
        }).join('');

        const customFieldsHtml = localConfig.customFields?.map(field => {
            if (field.type === 'section') return `<h4 class="font-bold text-lg mt-6 mb-3 border-b-2 border-gray-300 pb-1 ${style==='dark'?'text-amber-500 border-slate-600':'text-gray-800'} break-after-avoid print:text-black print:border-black">${field.label}</h4>`;
            if (field.type === 'statement') return `<div class="mb-4 text-sm text-justify leading-relaxed ${style==='dark'?'text-gray-300':'text-gray-700'} print:text-black">${field.label}</div>`;
            if (field.type === 'text') return renderInput(field.label, `custom_${field.id}`, 'text', '', field.required);
            if (field.type === 'file') return renderInput(field.label, `custom_${field.id}`, 'file', '', field.required);
            if (field.type === 'paragraph') return `<div class="mb-4 break-inside-avoid"><label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label><textarea name="custom_${field.id}" rows="3" ${field.required ? 'required' : ''} class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 outline-none print:bg-white print:border-black"></textarea></div>`;
            if (field.type === 'radio' || field.type === 'checkbox') {
                const opts = field.options?.filter(o => o.trim() !== '') || [];
                const optionsHtml = opts.map(opt => `<label class="flex items-center gap-2 cursor-pointer p-1"><input type="${field.type}" name="custom_${field.id}${field.type==='checkbox'?'[]':''}" value="${opt}" class="w-4 h-4 text-teal-600"> <span class="text-sm">${opt}</span></label>`).join('');
                return `<div class="mb-4 break-inside-avoid"><label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label><div class="space-y-1 mt-1">${optionsHtml}</div></div>`;
            }
            return '';
        }).join('') || '';

        const docsHtml = localConfig.requiredDocuments.map(doc => 
            `<label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 print:border-black">
                <input type="checkbox" name="docs[]" value="${doc}" class="w-5 h-5 text-teal-600 print:text-black">
                <span class="${style==='dark'?'text-gray-300 print:text-black':'text-gray-700'} text-sm">${doc}</span>
             </label>`
        ).join('');

        let bodyClass = "bg-gray-100 min-h-screen py-10 font-sans text-gray-800 print:bg-white print:py-0";
        let wrapperClass = "bg-white shadow-xl mx-auto max-w-2xl p-8 rounded-lg print:shadow-none print:max-w-none print:p-0";
        let headerHtml = `<div class="text-center mb-8"><h1 class="text-2xl font-bold">${settings.namaPonpes}</h1><p>Formulir Pendaftaran</p></div>`;

        if (style === 'classic') {
             wrapperClass = "bg-white shadow-xl mx-auto max-w-[210mm] border-t-8 border-[#D4AF37] p-10 font-serif print:shadow-none print:border-none print:max-w-none print:p-0";
             headerHtml = `<div class="text-center border-b-2 border-[#D4AF37] pb-6 mb-8 print:border-black"><h1 class="text-3xl font-bold text-[#1B4D3E] uppercase tracking-wide print:text-black">Formulir Pendaftaran</h1><p class="text-[#D4AF37] font-semibold tracking-widest uppercase text-sm mt-2 print:text-black">${settings.namaPonpes}</p></div>`;
        } else if (style === 'modern') {
             bodyClass = "bg-slate-50 min-h-screen py-10 font-sans print:bg-white";
             wrapperClass = "bg-white shadow-xl mx-auto max-w-[210mm] border border-gray-200 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:max-w-none";
             headerHtml = `<div class="bg-blue-600 p-8 text-white flex justify-between items-center print:bg-white print:text-black print:border-b-2 print:border-blue-600 print:mb-6"><div><h1 class="text-3xl font-bold tracking-tight">Registration</h1><p class="text-blue-100 print:text-gray-600">${settings.namaPonpes}</p></div><div class="text-5xl opacity-30 print:hidden"><i class="fas fa-file-signature"></i></div></div><div class="p-8 print:p-0">`;
        } else if (style === 'bold') {
             wrapperClass = "bg-white shadow-xl mx-auto max-w-[210mm] border-t-8 border-red-700 p-0 print:shadow-none print:border-none print:max-w-none";
             headerHtml = `<div class="flex bg-white border-b border-gray-200 mb-8"><div class="w-4 bg-red-700 print:hidden"></div><div class="p-8 flex-1 print:p-0 print:mb-4"><h2 class="text-red-700 font-bold tracking-widest uppercase text-sm mb-1 print:text-black">Penerimaan Santri Baru</h2><h1 class="text-4xl font-extrabold text-gray-900">${settings.namaPonpes}</h1></div></div><div class="p-10 space-y-8 print:p-0">`;
        } else if (style === 'dark') {
             bodyClass = "bg-black min-h-screen py-10 font-sans print:bg-white";
             wrapperClass = "bg-slate-900 shadow-2xl mx-auto max-w-[210mm] text-slate-300 border border-slate-700 relative overflow-hidden p-10 print:bg-white print:text-black print:shadow-none print:border-none print:max-w-none print:p-0";
             headerHtml = `<div class="text-center mb-10 border-b border-slate-700 pb-6 print:border-black"><h2 class="text-amber-500 text-xs tracking-[0.3em] uppercase mb-3 print:text-black">Application Form</h2><h1 class="text-3xl md:text-4xl font-serif text-white mb-2 print:text-black">${settings.namaPonpes}</h1></div>`;
        } else if (style === 'ceria') {
             wrapperClass = "bg-orange-50 shadow-xl mx-auto max-w-[210mm] border-4 border-dashed border-orange-300 rounded-3xl overflow-hidden font-poppins p-8 print:bg-white print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-0";
             headerHtml = `<div class="text-center mb-8 relative z-10"><h2 class="text-teal-600 font-bold text-lg mb-1 print:text-black">Formulir Pendaftaran</h2><h1 class="text-3xl font-black text-orange-500 drop-shadow-sm print:text-black">${settings.namaPonpes}</h1></div>`;
        }

        const closeDiv = (style === 'modern' || style === 'bold') ? '</div>' : '';

        const script = `
        <script>
            const filesData = {};

            function handleFile(input) {
                const file = input.files[0];
                if (!file) return;
                
                if (file.size > 512000) {
                    alert("File " + file.name + " terlalu besar! Maksimal adalah 500KB. Silakan kompres file Anda terlebih dahulu.");
                    input.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    filesData[input.name] = e.target.result;
                };
                reader.readAsDataURL(file);
            }

            async function uploadToCloud(data, method) {
                try {
                    if (method === 'dropbox') {
                        const filename = 'pendaftar_' + Date.now() + '.json';
                        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer ${dropboxToken}',
                                'Dropbox-API-Arg': JSON.stringify({ path: '/esantri_psb/' + filename, mode: 'add', autorename: true }),
                                'Content-Type': 'application/octet-stream'
                            },
                            body: JSON.stringify(data)
                        });
                        return response.ok;
                    } else if (method === 'supabase') {
                        const response = await fetch('${supabaseUrl}/rest/v1/pendaftar', {
                            method: 'POST',
                            headers: {
                                'apikey': '${supabaseKey}',
                                'Authorization': 'Bearer ${supabaseKey}',
                                'Content-Type': 'application/json',
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify(data)
                        });
                        return response.ok;
                    }
                } catch (e) { console.error(e); return false; }
                return false;
            }

            async function submitForm() {
                const form = document.getElementById('psbForm');
                if(!form.checkValidity()) { form.reportValidity(); return; }
                
                const btn = document.getElementById('submit-btn');
                const originalContent = btn.innerHTML;
                
                const formData = new FormData(form);
                const data = { tanggalDaftar: new Date().toISOString(), status: 'Baru' };
                const customData = {};

                formData.forEach((value, key) => {
                    if(key.startsWith('custom_')) { 
                        const fieldName = key.replace('custom_', '');
                        customData[fieldName] = filesData[key] || value; 
                    }
                    else if(key === 'docs[]') { if(!data.docs) data.docs = []; data.docs.push(value); }
                    else { data[key] = value; }
                });
                data.customData = JSON.stringify(customData);

                if (${localConfig.enableCloudSubmit && cloudProvider !== 'none'}) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan ke Database...';
                    
                    const success = await uploadToCloud(data, '${cloudProvider}');
                    if(!success) {
                        alert("Gagal terhubung ke database Cloud. Pendaftaran akan tetap dilanjutkan melalui WhatsApp.");
                    }
                }

                btn.innerHTML = '<i class="fab fa-whatsapp"></i> Membuka WhatsApp...';
                
                let message = "*Pendaftaran Santri Baru*\\n*${settings.namaPonpes}*\\n\\n";
                message += "Nama: " + data.namaLengkap + "\\n";
                message += "Jenjang: " + "${jenjangName}" + "\\n";
                
                const fileFields = Object.keys(filesData).length;
                if(fileFields > 0) {
                    message += "\\n⚠ *PENTING:* Anda telah melampirkan " + fileFields + " dokumen di formulir. Harap lampirkan kembali file tersebut secara manual di chat ini sebagai bukti tambahan.\\n";
                }

                message += "\\n--------------------------------\\n";
                message += "PSB_START\\n" + JSON.stringify(data) + "\\nPSB_END";
                
                const phone = "${localConfig.nomorHpAdmin.replace(/^0/, '62')}";
                
                setTimeout(() => {
                    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(message), '_blank');
                    btn.disabled = false;
                    btn.innerHTML = originalContent;
                }, 800);
            }
        </script>`;

        return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pendaftaran ${settings.namaPonpes}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        @media print { 
            @page { size: A4; margin: 0; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; } 
            .printable-content-wrapper { box-shadow: none !important; margin: 0 !important; }
        }
        .screen-only { display: block; }
        .print-only { display: none; }
        @media print { .screen-only { display: none; } .print-only { display: block; } }
    </style>
</head>
<body class="${bodyClass}">
    <div class="${wrapperClass}">
        ${headerHtml}
        <form id="psbForm" onsubmit="event.preventDefault();">
            <div class="mb-6 break-inside-avoid">
                 <label class="block font-bold mb-1 text-gray-700 print:text-black">Jenjang Pendidikan</label>
                 <div class="font-bold text-lg p-2 bg-gray-50 border-b border-gray-300 print:border-none print:bg-transparent print:p-0 print:text-black">${jenjangName}</div>
                 <input type="hidden" name="jenjangId" value="${localConfig.targetJenjangId || ''}" />
            </div>
            ${activeFieldsHtml}
            ${localConfig.requiredDocuments.length > 0 ? `<div class="mt-8 mb-6 p-4 border rounded-lg break-inside-avoid">
                <h4 class="font-bold mb-3">Persyaratan Berkas</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${docsHtml}</div>
            </div>` : ''}
            ${customFieldsHtml}
            <div class="mt-8 no-print space-y-3">
                <button type="button" id="submit-btn" onclick="submitForm()" class="w-full flex justify-center items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition shadow-md">
                    <i class="fab fa-whatsapp text-xl"></i> Kirim Pendaftaran
                </button>
            </div>
        </form>
        ${closeDiv}
    </div>
    ${script}
</body>
</html>`;
    };

    const handleDownloadPdf = () => {
        const htmlContent = generateHtml();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1000);
        }
    };

    useEffect(() => {
        const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
        if (iframe) { iframe.srcdoc = generateHtml(); }
    }, [localConfig, settings]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            <div className="lg:col-span-4 bg-white p-6 rounded-lg shadow-md overflow-y-auto h-full space-y-6 text-sm">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <h3 className="font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2"><i className="bi bi-folder-fill"></i> Manajemen Formulir</h3>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Nama Formulir..." className="flex-grow border rounded p-1.5 text-xs"/>
                            <button onClick={handleSaveTemplate} className="bg-indigo-600 text-white px-3 rounded text-xs shrink-0">
                                {activeTemplateId ? 'Update' : 'Simpan'}
                            </button>
                        </div>
                        {localConfig.templates && localConfig.templates.length > 0 && (
                            <div className="space-y-1 max-h-32 overflow-y-auto border bg-white rounded p-1">
                                {localConfig.templates.map(tpl => (
                                    <div key={tpl.id} className={`flex justify-between items-center p-1.5 hover:bg-indigo-50 rounded transition-colors text-xs ${activeTemplateId === tpl.id ? 'bg-indigo-100 ring-1 ring-indigo-300' : ''}`}>
                                        <span className="font-medium truncate max-w-[150px]">{tpl.name}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleLoadTemplate(tpl.id)} className="text-blue-600 hover:bg-white p-1 rounded" title="Muat untuk Penyesuaian"><i className="bi bi-box-arrow-in-down"></i></button>
                                            <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-red-500 hover:bg-white p-1 rounded" title="Hapus"><i className="bi bi-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={handleResetForm} className="w-full text-xs text-red-600 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors">Buat Baru (Reset Builder)</button>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">1. Desain & Metode</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Target Jenjang (Wajib)</label>
                            <select value={localConfig.targetJenjangId || ''} onChange={e => setLocalConfig({...localConfig, targetJenjangId: parseInt(e.target.value)})} className="w-full border rounded p-2 text-sm bg-yellow-50">
                                <option value="">-- Pilih Jenjang --</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={localConfig.enableCloudSubmit} onChange={e => setLocalConfig({...localConfig, enableCloudSubmit: e.target.checked})} className="w-4 h-4 text-blue-600 rounded"/>
                                <span className="text-xs font-bold text-blue-800">Aktifkan Sinkronisasi Cloud</span>
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Gaya Desain</label>
                            <select value={localConfig.designStyle} onChange={e => setLocalConfig({...localConfig, designStyle: e.target.value as PsbDesignStyle})} className="w-full border rounded p-2 text-sm">
                                {styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">2. Kelengkapan Data</h3>
                    <div className="space-y-4 max-h-64 overflow-y-auto border p-2 rounded bg-gray-50 shadow-inner">
                        {fieldGroups.map((group, gIdx) => (
                            <div key={gIdx} className="border-b pb-2 mb-2 last:border-0">
                                <h4 className="font-bold text-[10px] text-teal-700 mb-1 uppercase tracking-tight">{group.title}</h4>
                                <div className="space-y-1">
                                    {group.fields.map(f => (
                                        <label key={f.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                            <input type="checkbox" checked={localConfig.activeFields.includes(f.key)} onChange={() => toggleField(f.key)} className="text-teal-600 rounded w-4 h-4"/>
                                            <span className="text-xs text-gray-700">{f.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">3. Persyaratan Berkas</h3>
                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newDoc} 
                                onChange={e => setNewDoc(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && addDocument()}
                                placeholder="Tambah Berkas (cth: KK)" 
                                className="flex-grow border rounded p-1.5 text-xs"
                            />
                            <button onClick={addDocument} className="bg-teal-600 text-white px-3 rounded text-xs">Tambah</button>
                        </div>
                        <div className="space-y-1">
                            {localConfig.requiredDocuments.map((doc, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded border group">
                                    <span className="text-xs text-gray-700">{doc}</span>
                                    <button onClick={() => removeDocument(idx)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i className="bi bi-x-circle"></i></button>
                                </div>
                            ))}
                            {localConfig.requiredDocuments.length === 0 && <p className="text-[10px] text-gray-400 italic text-center">Belum ada berkas persyaratan.</p>}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">4. Pertanyaan Tambahan</h3>
                    <CustomFieldEditor fields={localConfig.customFields || []} onChange={(fields) => setLocalConfig({...localConfig, customFields: fields})} />
                </div>

                <div className="pt-4 border-t sticky bottom-0 bg-white">
                    <button onClick={() => onSave(localConfig)} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium shadow-md">Simpan Konfigurasi Utama</button>
                </div>
            </div>
            
            <div className="lg:col-span-8 flex flex-col h-full bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
                <div className="bg-white p-3 border-b flex justify-between items-center shadow-sm">
                    <div className="flex flex-col">
                        <h3 className="font-bold text-gray-700"><i className="bi bi-eye mr-2"></i>Live Preview</h3>
                        {activeTemplateId && <span className="text-[10px] text-teal-600 font-medium italic">Sedang Menyesuaikan: {templateName}</span>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadPdf} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 flex items-center gap-2"><i className="bi bi-file-pdf"></i> Cetak / PDF</button>
                        <button onClick={() => { const html = generateHtml(); const b = new Blob([html], {type:'text/html'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='Form_PSB.html'; a.click(); }} className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm hover:bg-teal-700"><i className="bi bi-filetype-html"></i> Download HTML</button>
                    </div>
                </div>
                <div className="flex-grow bg-gray-500/10 p-4 overflow-hidden">
                    <iframe id="preview-frame" className="w-full h-full bg-white shadow-lg rounded" title="Form Preview" style={{ border: 'none' }}></iframe>
                </div>
            </div>
        </div>
    );
};

const PSB: React.FC = () => {
    const { settings, onSaveSettings, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'rekap' | 'form' | 'poster'>('dashboard');
    const [pendaftarList, setPendaftarList] = useState<Pendaftar[]>([]);

    const fetchPendaftar = async () => {
        try {
            const data = await db.pendaftar.toArray();
            setPendaftarList(data);
        } catch (error) {
            console.error("Failed to fetch pendaftar:", error);
        }
    };

    useEffect(() => {
        fetchPendaftar();
    }, []);

    const handleSaveConfig = async (newConfig: PsbConfig) => {
        const updatedSettings = { ...settings, psbConfig: newConfig };
        await onSaveSettings(updatedSettings);
    };

    const handleImportFromWA = (text: string) => {
        try {
            const match = text.match(/PSB_START([\s\S]*?)PSB_END/);
            if (match && match[1]) {
                const data = JSON.parse(match[1].trim());
                const newPendaftar: Pendaftar = {
                    id: Date.now(),
                    ...data,
                    jenjangId: parseInt(data.jenjangId),
                    tanggalDaftar: data.tanggalDaftar || new Date().toISOString(),
                    status: 'Baru',
                    kewarganegaraan: 'WNI',
                    gelombang: settings.psbConfig.activeGelombang
                };
                db.pendaftar.add(newPendaftar).then(() => {
                    fetchPendaftar();
                    showToast('Data dari WhatsApp berhasil diimpor.', 'success');
                });
            } else {
                showToast('Format pesan tidak valid.', 'error');
            }
        } catch (e) {
            showToast('Gagal memproses data JSON.', 'error');
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Penerimaan Santri Baru (PSB)</h1>
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto gap-4">
                    <button onClick={() => setActiveTab('dashboard')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'dashboard' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-speedometer2 mr-2"></i>Dashboard</button>
                    <button onClick={() => setActiveTab('rekap')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'rekap' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-people-fill mr-2"></i>Rekap Pendaftar</button>
                    <button onClick={() => setActiveTab('form')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'form' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-ui-checks mr-2"></i>Desain Formulir Online</button>
                    <button onClick={() => setActiveTab('poster')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'poster' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-stars mr-2"></i>Poster AI</button>
                </nav>
            </div>
            {activeTab === 'dashboard' && <PsbDashboard pendaftarList={pendaftarList} config={settings.psbConfig} settings={settings} />}
            {activeTab === 'rekap' && <PsbRekap pendaftarList={pendaftarList} settings={settings} onImportFromWA={handleImportFromWA} onUpdateList={fetchPendaftar} />}
            {activeTab === 'form' && <PsbFormBuilder config={settings.psbConfig} settings={settings} onSave={handleSaveConfig} />}
            {activeTab === 'poster' && <PsbPosterMaker settings={settings} />}
        </div>
    );
};

export default PSB;
