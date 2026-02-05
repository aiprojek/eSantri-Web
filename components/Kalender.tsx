
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { CalendarEvent, PondokSettings, PiketSchedule, Santri } from '../types';
import { printToPdfNative } from '../utils/pdfGenerator';
import { CalendarPrintTemplate } from './kalender/CalendarPrintTemplate';
import { BulkEventModal } from './kalender/modals/BulkEventModal';
import { formatDate, getHijriDate, findStartOfHijriMonth } from '../utils/formatters';
import { useSantriContext } from '../contexts/SantriContext';

// --- EVENT MODAL ---
interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<CalendarEvent, 'id'>) => Promise<void>;
    onUpdate: (data: CalendarEvent) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    eventData: CalendarEvent | null;
    selectedDate?: string;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, onUpdate, onDelete, eventData, selectedDate }) => {
    const { register, handleSubmit, reset, setValue } = useForm<CalendarEvent>();

    React.useEffect(() => {
        if (isOpen) {
            if (eventData) {
                reset(eventData);
            } else {
                reset({
                    title: '',
                    startDate: selectedDate || new Date().toISOString().split('T')[0],
                    endDate: selectedDate || new Date().toISOString().split('T')[0],
                    category: 'Kegiatan',
                    color: 'bg-blue-500',
                    description: ''
                });
            }
        }
    }, [isOpen, eventData, selectedDate, reset]);

    const onSubmit = async (data: CalendarEvent) => {
        if (eventData?.id) {
            await onUpdate({ ...data, id: eventData.id });
        } else {
            await onSave(data);
        }
        onClose();
    };

    if (!isOpen) return null;

    const colors = [
        { label: 'Merah', val: 'bg-red-500' },
        { label: 'Hijau', val: 'bg-green-500' },
        { label: 'Biru', val: 'bg-blue-500' },
        { label: 'Kuning', val: 'bg-yellow-500' },
        { label: 'Ungu', val: 'bg-purple-500' },
        { label: 'Pink', val: 'bg-pink-500' },
        { label: 'Abu', val: 'bg-gray-500' },
        { label: 'Teal', val: 'bg-teal-500' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-gray-800">{eventData ? 'Edit Agenda' : 'Tambah Agenda'}</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg"></i></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nama Kegiatan</label>
                        <input type="text" {...register('title', { required: true })} className="w-full border rounded p-2 text-sm" placeholder="Contoh: Ujian Tengah Semester" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Mulai</label>
                            <input type="date" {...register('startDate', { required: true })} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-700 mb-1">Selesai</label>
                            <input type="date" {...register('endDate', { required: true })} className="w-full border rounded p-2 text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                            <select {...register('category')} className="w-full border rounded p-2 text-sm">
                                <option value="Libur">Libur</option>
                                <option value="Ujian">Ujian</option>
                                <option value="Kegiatan">Kegiatan</option>
                                <option value="Rapat">Rapat</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Warna Label</label>
                            <div className="flex flex-wrap gap-2">
                                {colors.map(c => (
                                    <button 
                                        key={c.val}
                                        type="button" 
                                        onClick={() => setValue('color', c.val)}
                                        className={`w-6 h-6 rounded-full ${c.val} hover:ring-2 ring-offset-1 transition-all focus:outline-none`}
                                        title={c.label}
                                    ></button>
                                ))}
                            </div>
                            <input type="hidden" {...register('color')} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi (Opsional)</label>
                        <textarea {...register('description')} rows={3} className="w-full border rounded p-2 text-sm"></textarea>
                    </div>
                    
                    <div className="pt-4 border-t flex justify-end gap-2">
                        {eventData && (
                            <button type="button" onClick={() => { if(window.confirm('Hapus kegiatan ini?')) onDelete(eventData.id); onClose(); }} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded text-sm font-medium mr-auto">Hapus</button>
                        )}
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 text-sm">Batal</button>
                        <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- PRINT MODAL ---
interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPrint: (theme: any, layout: any, primarySystem: 'Masehi' | 'Hijriah', showKop: boolean, customImage?: string, imagePosition?: 'banner' | 'watermark' | 'none') => void;
    settings: PondokSettings;
    events: CalendarEvent[];
    year: number;
}

const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, onPrint, settings, events, year }) => {
    const [theme, setTheme] = useState<'classic' | 'modern' | 'bold' | 'dark' | 'ceria'>('classic');
    const [layout, setLayout] = useState<'1_sheet' | '3_sheets' | '4_sheets'>('1_sheet');
    const [primarySystem, setPrimarySystem] = useState<'Masehi' | 'Hijriah'>('Masehi');
    const [showKop, setShowKop] = useState(true);
    const [activeTab, setActiveTab] = useState<'settings' | 'theme' | 'images'>('settings');
    const [zoomScale, setZoomScale] = useState(0.4);

    // Image State
    const [customImage, setCustomImage] = useState<string>('');
    const [imagePosition, setImagePosition] = useState<'banner' | 'watermark' | 'none'>('none');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const previewRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCustomImage(event.target?.result as string);
                if (imagePosition === 'none') setImagePosition('banner'); // Default to banner on upload
            };
            reader.readAsDataURL(file);
        }
    };

    const TabButton = ({ id, label, icon }: { id: string, label: string, icon: string }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === id ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
        >
            <i className={`bi ${icon}`}></i> {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[80] flex justify-center items-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-printer-fill text-teal-600"></i> Cetak Kalender
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"><i className="bi bi-x-lg text-xl"></i></button>
                </div>

                <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                    {/* Left: Configuration Panel */}
                    <div className="w-full lg:w-1/3 border-r flex flex-col bg-white">
                        <div className="flex border-b">
                            <TabButton id="settings" label="Pengaturan" icon="bi-sliders" />
                            <TabButton id="theme" label="Tampilan" icon="bi-palette" />
                            <TabButton id="images" label="Gambar" icon="bi-image" />
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-grow space-y-6">
                            {activeTab === 'settings' && (
                                <div className="space-y-5 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Penanggalan Utama</label>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button onClick={() => setPrimarySystem('Masehi')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${primarySystem === 'Masehi' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Masehi</button>
                                            <button onClick={() => setPrimarySystem('Hijriah')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${primarySystem === 'Hijriah' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Hijriah</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Tata Letak (Layout)</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { id: '1_sheet', label: '1 Lembar (12 Bulan)', desc: 'Ringkas, cocok untuk dinding.' },
                                                { id: '3_sheets', label: '3 Lembar (4 Bulan/hlm)', desc: 'Ukuran sedang, terbaca jelas.' },
                                                { id: '4_sheets', label: '4 Lembar (3 Bulan/hlm)', desc: 'Detail, ruang catatan luas.' }
                                            ].map(opt => (
                                                <div key={opt.id} onClick={() => setLayout(opt.id as any)} className={`border rounded-lg p-3 cursor-pointer transition-all ${layout === opt.id ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                                                    <div className="font-bold text-sm text-gray-800">{opt.label}</div>
                                                    <div className="text-xs text-gray-500">{opt.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Opsi Konten</label>
                                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setShowKop(!showKop)}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${showKop ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-400'}`}>
                                                {showKop && <i className="bi bi-check"></i>}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-800">Tampilkan Kop Surat</div>
                                                <div className="text-xs text-gray-500">Logo, Nama Pondok, dan Alamat di bagian atas.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'theme' && (
                                <div className="space-y-4 animate-fade-in">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Pilih Tema Desain</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'classic', label: 'Classic', color: 'bg-[#1B4D3E]', text: 'text-[#D4AF37]' },
                                            { id: 'modern', label: 'Modern Blue', color: 'bg-blue-600', text: 'text-white' },
                                            { id: 'bold', label: 'Bold B&W', color: 'bg-black', text: 'text-white' },
                                            { id: 'dark', label: 'Dark Mode', color: 'bg-slate-900', text: 'text-teal-400' },
                                            { id: 'ceria', label: 'Ceria', color: 'bg-orange-400', text: 'text-white' }
                                        ].map(t => (
                                            <button 
                                                key={t.id} 
                                                onClick={() => setTheme(t.id as any)} 
                                                className={`relative h-20 rounded-lg border-2 overflow-hidden text-left p-3 transition-all ${theme === t.id ? 'border-teal-600 ring-2 ring-teal-200 scale-105 shadow-md' : 'border-transparent hover:scale-105 shadow-sm'}`}
                                            >
                                                <div className={`absolute inset-0 ${t.color}`}></div>
                                                <span className={`relative z-10 font-bold ${t.text}`}>{t.label}</span>
                                                {theme === t.id && <div className="absolute bottom-2 right-2 bg-white text-teal-600 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"><i className="bi bi-check"></i></div>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'images' && (
                                <div className="space-y-5 animate-fade-in">
                                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                                        <label className="block text-xs font-bold text-teal-800 mb-2 uppercase tracking-wide">Upload Gambar Custom</label>
                                        <p className="text-xs text-teal-700 mb-3">Sisipkan foto gedung, kegiatan, atau logo besar untuk mempercantik kalender.</p>
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-white border border-teal-300 text-teal-700 rounded-lg text-sm font-bold hover:bg-teal-100 flex items-center justify-center gap-2">
                                            <i className="bi bi-upload"></i> Pilih Gambar
                                        </button>
                                    </div>

                                    {customImage && (
                                        <div>
                                            <div className="mb-4 rounded-lg overflow-hidden border">
                                                <img src={customImage} alt="Preview" className="w-full h-32 object-cover" />
                                            </div>
                                            
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Posisi Gambar</label>
                                            <div className="space-y-2">
                                                <div onClick={() => setImagePosition('banner')} className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${imagePosition === 'banner' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                                                    <div className="w-8 h-8 bg-blue-200 rounded flex items-center justify-center text-blue-700"><i className="bi bi-card-image"></i></div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-800">Banner Atas (Cover)</div>
                                                        <div className="text-xs text-gray-500">Gambar besar di bagian paling atas.</div>
                                                    </div>
                                                </div>
                                                <div onClick={() => setImagePosition('watermark')} className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${imagePosition === 'watermark' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                                                    <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center text-purple-700"><i className="bi bi-droplet-half"></i></div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-800">Watermark (Background)</div>
                                                        <div className="text-xs text-gray-500">Transparan di tengah halaman.</div>
                                                    </div>
                                                </div>
                                                <div onClick={() => { setImagePosition('none'); setCustomImage(''); }} className="p-2 text-center text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer border border-transparent hover:border-red-200 mt-2">
                                                    Hapus Gambar
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50">
                            <button 
                                onClick={() => onPrint(theme, layout, primarySystem, showKop, customImage, imagePosition)} 
                                className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-printer-fill"></i> Cetak / Download PDF
                            </button>
                        </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="w-full lg:w-2/3 bg-gray-200 relative overflow-hidden flex flex-col">
                        <div className="absolute top-4 right-4 z-20 flex bg-white rounded-lg shadow-sm border p-1 gap-2">
                            <button onClick={() => setZoomScale(z => Math.max(0.2, z - 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"><i className="bi bi-dash"></i></button>
                            <span className="text-xs font-mono w-10 flex items-center justify-center">{Math.round(zoomScale * 100)}%</span>
                            <button onClick={() => setZoomScale(z => Math.min(1.5, z + 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"><i className="bi bi-plus"></i></button>
                        </div>
                        
                        <div className="flex-grow overflow-auto p-8 flex justify-center items-start custom-scrollbar" ref={previewRef}>
                            <div 
                                className="origin-top transition-transform duration-200 ease-out bg-white shadow-xl"
                                style={{ transform: `scale(${zoomScale})` }}
                            >
                                <CalendarPrintTemplate 
                                    year={year} 
                                    events={events} 
                                    settings={settings} 
                                    theme={theme}
                                    layout={layout}
                                    primarySystem={primarySystem}
                                    showKop={showKop}
                                    customImage={customImage}
                                    imagePosition={imagePosition}
                                />
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur text-xs text-gray-500 p-2 text-center border-t">
                            Preview ini adalah simulasi. Hasil cetak PDF sesungguhnya mungkin memiliki margin yang sedikit berbeda.
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
};

// --- STUDENT SELECTOR MODAL (NEW) ---
interface StudentSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (santriId: number | null) => void;
    title: string;
}

const StudentSelectorModal: React.FC<StudentSelectorModalProps> = ({ isOpen, onClose, onSelect, title }) => {
    const { settings } = useAppContext();
    const { santriList } = useSantriContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterJenjang, setFilterJenjang] = useState<number>(0);
    const [filterKelas, setFilterKelas] = useState<number>(0);
    const [filterRombel, setFilterRombel] = useState<number>(0);

    // Derived Available Options
    const availableKelas = useMemo(() => filterJenjang ? settings.kelas.filter(k => k.jenjangId === filterJenjang) : [], [filterJenjang, settings.kelas]);
    const availableRombel = useMemo(() => filterKelas ? settings.rombel.filter(r => r.kelasId === filterKelas) : [], [filterKelas, settings.rombel]);

    const filteredSantri = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif' || s.jenisKelamin !== 'Laki-laki') return false; // Filter hanya Laki-laki aktif
            if (filterJenjang && s.jenjangId !== filterJenjang) return false;
            if (filterKelas && s.kelasId !== filterKelas) return false;
            if (filterRombel && s.rombelId !== filterRombel) return false;
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                if (!s.namaLengkap.toLowerCase().includes(lower) && !s.nis.includes(lower)) return false;
            }
            return true;
        }).slice(0, 50); // Limit results for performance
    }, [santriList, filterJenjang, filterKelas, filterRombel, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg text-gray-500"></i></button>
                </div>
                
                <div className="p-4 space-y-3 bg-gray-50 border-b">
                    <div className="relative">
                        <input type="text" placeholder="Cari nama santri..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2 border rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500" autoFocus />
                        <i className="bi bi-search absolute left-3 top-2.5 text-gray-400"></i>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <select value={filterJenjang} onChange={e => {setFilterJenjang(Number(e.target.value)); setFilterKelas(0); setFilterRombel(0);}} className="w-full border rounded p-2 text-xs">
                            <option value={0}>Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                        <select value={filterKelas} onChange={e => {setFilterKelas(Number(e.target.value)); setFilterRombel(0);}} disabled={!filterJenjang} className="w-full border rounded p-2 text-xs disabled:bg-gray-200">
                            <option value={0}>Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                        <select value={filterRombel} onChange={e => setFilterRombel(Number(e.target.value))} disabled={!filterKelas} className="w-full border rounded p-2 text-xs disabled:bg-gray-200">
                            <option value={0}>Rombel</option>
                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-2 space-y-1">
                    <button onClick={() => onSelect(null)} className="w-full text-left p-3 hover:bg-red-50 rounded-lg text-red-600 font-medium text-sm flex items-center gap-2 border border-transparent hover:border-red-200 mb-2">
                        <i className="bi bi-x-circle"></i> Kosongkan / Hapus Petugas
                    </button>
                    {filteredSantri.map(s => (
                        <button key={s.id} onClick={() => onSelect(s.id)} className="w-full text-left p-3 hover:bg-teal-50 rounded-lg flex items-center gap-3 border border-transparent hover:border-teal-200 transition-colors group">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-teal-200 group-hover:text-teal-800">
                                {s.namaLengkap.charAt(0)}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-800 group-hover:text-teal-900">{s.namaLengkap}</div>
                                <div className="text-xs text-gray-500">{settings.rombel.find(r=>r.id===s.rombelId)?.nama} • {s.nis}</div>
                            </div>
                        </button>
                    ))}
                    {filteredSantri.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">Tidak ada santri ditemukan.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- TAB JADWAL PIKET (NEW) ---
const JadwalPiketView: React.FC = () => {
    const { settings, showToast, showConfirmation, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keasramaan === 'write'; 

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [piketList, setPiketList] = useState<PiketSchedule[]>([]);
    
    // Modal Selector State
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<{ id: number | null, sholat: string, field: 'muadzinSantriId' | 'imamSantriId' } | null>(null);

    const sholatList = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const;

    useEffect(() => {
        const fetchPiket = async () => {
            const data = await db.piketSchedules.where('tanggal').equals(selectedDate).toArray();
            setPiketList(data);
        };
        fetchPiket();
    }, [selectedDate]);

    const handleOpenSelector = (sholat: string, field: 'muadzinSantriId' | 'imamSantriId') => {
        if (!canWrite) return;
        const existing = piketList.find(p => p.sholat === sholat);
        setEditingSlot({ id: existing ? existing.id : null, sholat, field });
        setSelectorOpen(true);
    };

    const handleSelectSantri = async (santriId: number | null) => {
        setSelectorOpen(false);
        if (!editingSlot) return;

        const { id, sholat, field } = editingSlot;
        
        if (id) {
            await db.piketSchedules.update(id, { [field]: santriId || undefined, lastModified: Date.now() });
            setPiketList(prev => prev.map(p => p.id === id ? { ...p, [field]: santriId || undefined } : p));
        } else {
            const newItem: PiketSchedule = {
                id: Date.now(),
                tanggal: selectedDate,
                sholat: sholat as any,
                [field]: santriId || undefined,
                lastModified: Date.now()
            };
            await db.piketSchedules.add(newItem);
            setPiketList(prev => [...prev, newItem]);
        }
    };

    const handleAutoGenerate = () => {
        if (!canWrite) return;
        showConfirmation('Generate Otomatis?', 'Sistem akan memilih santri secara acak untuk mengisi jadwal yang kosong pada tanggal ini.', async () => {
            const activeSantri = santriList.filter(s => s.status === 'Aktif' && s.jenisKelamin === 'Laki-laki');
            if (activeSantri.length < 5) {
                showToast('Jumlah santri putra kurang dari 5, tidak cukup untuk generate.', 'error');
                return;
            }

            const updates = [];
            for (const sholat of sholatList) {
                const existing = piketList.find(p => p.sholat === sholat);
                const randomSantri = activeSantri[Math.floor(Math.random() * activeSantri.length)];
                
                if (!existing) {
                    updates.push(db.piketSchedules.add({
                        id: Date.now() + Math.random(),
                        tanggal: selectedDate,
                        sholat,
                        muadzinSantriId: randomSantri.id,
                        lastModified: Date.now()
                    } as PiketSchedule));
                } else if (!existing.muadzinSantriId) {
                     updates.push(db.piketSchedules.update(existing.id, { muadzinSantriId: randomSantri.id, lastModified: Date.now() }));
                }
            }
            await Promise.all(updates);
            // Refresh
            const data = await db.piketSchedules.where('tanggal').equals(selectedDate).toArray();
            setPiketList(data);
            showToast('Jadwal piket berhasil digenerate.', 'success');
        }, { confirmColor: 'blue' });
    };

    const getSantriName = (id?: number) => {
        if (!id) return null;
        const s = santriList.find(s => s.id === id);
        return s ? s.namaLengkap : 'Unknown';
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Jadwal Piket Ibadah</h2>
                    <p className="text-sm text-gray-500">Petugas Adzan dan Imam santri harian.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded-lg p-2 text-sm" />
                    {canWrite && (
                        <button onClick={handleAutoGenerate} className="bg-teal-50 text-teal-700 border border-teal-200 px-3 py-2 rounded-lg text-sm font-bold hover:bg-teal-100 flex items-center gap-2">
                            <i className="bi bi-magic"></i> Auto Isi
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 uppercase border-b">
                        <tr>
                            <th className="p-3 w-32">Waktu Sholat</th>
                            <th className="p-3 w-1/3">Muadzin</th>
                            <th className="p-3 w-1/3">Imam (Santri/Badal)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sholatList.map(sholat => {
                            const item = piketList.find(p => p.sholat === sholat);
                            const muadzinName = getSantriName(item?.muadzinSantriId);
                            const imamName = getSantriName(item?.imamSantriId);

                            return (
                                <tr key={sholat} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-teal-800 bg-gray-50/50 align-middle border-r">{sholat}</td>
                                    <td className="p-2">
                                        <button 
                                            onClick={() => handleOpenSelector(sholat, 'muadzinSantriId')}
                                            disabled={!canWrite}
                                            className={`w-full text-left px-3 py-2 rounded border transition-colors flex justify-between items-center ${muadzinName ? 'bg-white border-gray-300 text-gray-800' : 'bg-gray-50 border-dashed border-gray-300 text-gray-400'}`}
                                        >
                                            <span className="font-medium truncate">{muadzinName || 'Pilih Petugas...'}</span>
                                            {canWrite && <i className="bi bi-pencil-square text-xs opacity-50"></i>}
                                        </button>
                                    </td>
                                    <td className="p-2">
                                        <button 
                                            onClick={() => handleOpenSelector(sholat, 'imamSantriId')}
                                            disabled={!canWrite}
                                            className={`w-full text-left px-3 py-2 rounded border transition-colors flex justify-between items-center ${imamName ? 'bg-white border-gray-300 text-gray-800' : 'bg-gray-50 border-dashed border-gray-300 text-gray-400'}`}
                                        >
                                            <span className="font-medium truncate">{imamName || 'Pilih Petugas (Opsional)...'}</span>
                                            {canWrite && <i className="bi bi-pencil-square text-xs opacity-50"></i>}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded text-xs border border-blue-100 flex items-start gap-2">
                 <i className="bi bi-info-circle-fill text-lg"></i>
                 <div>
                     <strong>Info:</strong> Jadwal Imam santri bersifat latihan/badal. Imam utama tetap diasuh oleh Ustadz/Kyai sesuai jadwal pengajian.
                 </div>
            </div>

            {/* Modal Selector */}
            <StudentSelectorModal 
                isOpen={selectorOpen}
                onClose={() => setSelectorOpen(false)}
                onSelect={handleSelectSantri}
                title={editingSlot ? `Pilih ${editingSlot.field === 'muadzinSantriId' ? 'Muadzin' : 'Imam'} - ${editingSlot.sholat}` : 'Pilih Petugas'}
            />
        </div>
    );
}

// --- MAIN COMPONENT ---

const Kalender: React.FC = () => {
    const { showToast, currentUser, settings } = useAppContext();
    const events = useLiveQuery(() => db.calendarEvents.filter(e => !e.deleted).toArray(), []) || [];
    
    // State "anchorDate" selalu menyimpan tanggal referensi untuk grid yang sedang dilihat
    const [anchorDate, setAnchorDate] = useState(new Date()); 
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [primarySystem, setPrimarySystem] = useState<'Masehi' | 'Hijriah'>('Masehi');
    const [showFasting, setShowFasting] = useState(false); // NEW TOGGLE
    const [activeView, setActiveView] = useState<'kalender' | 'piket'>('kalender'); // NEW TAB

    // Print State
    const [printConfig, setPrintConfig] = useState<{
        theme: 'classic' | 'modern' | 'bold' | 'dark' | 'ceria', 
        layout: '1_sheet' | '3_sheets' | '4_sheets',
        primarySystem: 'Masehi' | 'Hijriah',
        showKop: boolean,
        customImage?: string,
        imagePosition?: 'banner' | 'watermark' | 'none'
    } | null>(null);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.kalender === 'write';
    const hijriAdjustment = settings.hijriAdjustment || 0;

    // Reset Anchor ketika ganti mode agar sinkron
    useEffect(() => {
        if (primarySystem === 'Masehi') {
            const now = new Date();
            setAnchorDate(new Date(now.getFullYear(), now.getMonth(), 1));
        } else {
            setAnchorDate(findStartOfHijriMonth(new Date(), hijriAdjustment));
        }
    }, [primarySystem, hijriAdjustment]);

    // ... (Existing logic for grid generation, header, navigation, event handling remains unchanged)
    
    // Grid Generation Logic
    const calendarDays = useMemo(() => {
        const days: { dateObj: Date, masehi: number, hijri: string, hijriDay: string, isFasting?: string, isRamadan?: boolean }[] = [];
        
        const processDay = (d: Date) => {
            const h = getHijriDate(d, hijriAdjustment);
            const dayOfWeek = d.getDay();
            const hDay = parseInt(h.day);
            const hMonth = h.month;

            let fastingType = '';
            let isRamadan = false;

            if (hMonth === 'Ramadhan') {
                isRamadan = true;
                fastingType = 'Ramadhan';
            } else {
                // Ayyamul Bidh (13, 14, 15) except Tasyrik days (Zulhijjah 13 is forbidden)
                if ([13, 14, 15].includes(hDay)) {
                    if (hMonth !== 'Dhu al-Hijjah' || hDay !== 13) {
                         fastingType = 'Ayyamul Bidh';
                    }
                } 
                // Monday Thursday
                else if (dayOfWeek === 1 || dayOfWeek === 4) {
                    // Check forbidden days (1 Syawal, 10 Dzulhijjah, Tasyrik 11,12,13)
                    const isSyawal1 = hMonth === 'Shawwal' && hDay === 1;
                    const isAdhaOrTasyrik = hMonth === 'Dhu al-Hijjah' && [10, 11, 12, 13].includes(hDay);
                    
                    if (!isSyawal1 && !isAdhaOrTasyrik) {
                         fastingType = 'Sunnah';
                    }
                }
            }

            return {
                dateObj: d,
                masehi: d.getDate(),
                hijri: `${h.month} ${h.year}`,
                hijriDay: h.day,
                isFasting: fastingType,
                isRamadan
            };
        };

        if (primarySystem === 'Masehi') {
            const year = anchorDate.getFullYear();
            const month = anchorDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                days.push(processDay(d));
            }
        } else {
            const startHijri = getHijriDate(anchorDate, hijriAdjustment);
            const targetHijriMonth = startHijri.month;
            
            let d = new Date(anchorDate);
            for (let i = 0; i < 30; i++) {
                const currentHijri = getHijriDate(d, hijriAdjustment);
                if (currentHijri.month !== targetHijriMonth) break; 
                days.push(processDay(new Date(d)));
                d.setDate(d.getDate() + 1);
            }
        }
        return days;
    }, [anchorDate, primarySystem, hijriAdjustment]);

     const headerInfo = useMemo(() => {
        if (calendarDays.length === 0) return { main: '', sub: '' };
        
        const firstDay = calendarDays[0];
        const lastDay = calendarDays[calendarDays.length - 1];
        
        if (primarySystem === 'Masehi') {
            const masehiMonth = firstDay.dateObj.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            const startHijri = getHijriDate(firstDay.dateObj, hijriAdjustment);
            const endHijri = getHijriDate(lastDay.dateObj, hijriAdjustment);
            const hijriStr = startHijri.month === endHijri.month 
                ? `${startHijri.month} ${startHijri.year}` 
                : `${startHijri.month} - ${endHijri.month} ${startHijri.year}`;
            return { main: masehiMonth.toUpperCase(), sub: `${hijriStr} H` };
        } else {
            const hijriMonth = getHijriDate(firstDay.dateObj, hijriAdjustment);
            const startMasehi = firstDay.dateObj.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            const endMasehi = lastDay.dateObj.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            const masehiStr = (firstDay.dateObj.getMonth() === lastDay.dateObj.getMonth())
                ? startMasehi
                : `${firstDay.dateObj.toLocaleString('id-ID', { month: 'long' })} - ${endMasehi}`;
            return { main: `${hijriMonth.month} ${hijriMonth.year}`.toUpperCase(), sub: masehiStr };
        }
    }, [calendarDays, primarySystem, hijriAdjustment]);

    const handlePrev = () => {
        if (primarySystem === 'Masehi') {
            setAnchorDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
        } else {
            const lastDayPrevMonth = new Date(anchorDate);
            lastDayPrevMonth.setDate(lastDayPrevMonth.getDate() - 1);
            setAnchorDate(findStartOfHijriMonth(lastDayPrevMonth, hijriAdjustment));
        }
    };

    const handleNext = () => {
        if (primarySystem === 'Masehi') {
            setAnchorDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
        } else {
            const lastGridDay = calendarDays[calendarDays.length - 1].dateObj;
            const nextMonthStart = new Date(lastGridDay);
            nextMonthStart.setDate(nextMonthStart.getDate() + 1);
            setAnchorDate(nextMonthStart); 
        }
    };

    const monthEvents = useMemo(() => {
        if (calendarDays.length === 0) return [];
        const start = calendarDays[0].dateObj;
        const end = calendarDays[calendarDays.length - 1].dateObj;
        
        return events.filter(e => {
            const eStart = new Date(e.startDate);
            const eEnd = new Date(e.endDate);
            eStart.setHours(0,0,0,0); eEnd.setHours(0,0,0,0); 
            const gridStart = new Date(start); gridStart.setHours(0,0,0,0);
            const gridEnd = new Date(end); gridEnd.setHours(0,0,0,0);
            return eStart <= gridEnd && eEnd >= gridStart;
        });
    }, [events, calendarDays]);

    const handleSaveEvent = async (data: Omit<CalendarEvent, 'id'>) => {
        if (!canWrite) return;
        await db.calendarEvents.add({ ...data, lastModified: Date.now() } as CalendarEvent);
        showToast('Agenda ditambahkan', 'success');
    };

    const handleBulkSaveEvents = async (data: Omit<CalendarEvent, 'id'>[]) => {
        if (!canWrite) return;
        const eventsWithTimestamp = data.map(e => ({ ...e, lastModified: Date.now() }));
        await db.calendarEvents.bulkAdd(eventsWithTimestamp as CalendarEvent[]);
        showToast(`${data.length} agenda berhasil ditambahkan.`, 'success');
    };

    const handleUpdateEvent = async (data: CalendarEvent) => {
        if (!canWrite) return;
        await db.calendarEvents.put({ ...data, lastModified: Date.now() });
        showToast('Agenda diperbarui', 'success');
    };

    const handleDeleteEvent = async (id: number) => {
        if (!canWrite) return;
        const evt = await db.calendarEvents.get(id);
        if(evt) {
            await db.calendarEvents.put({ ...evt, deleted: true, lastModified: Date.now() });
            showToast('Agenda dihapus', 'success');
        }
    };

    const handlePrintRequest = (theme: any, layout: any, system: 'Masehi' | 'Hijriah', showKop: boolean, customImage?: string, imagePosition?: 'banner' | 'watermark' | 'none') => {
        setPrintConfig({ theme, layout, primarySystem: system, showKop, customImage, imagePosition });
        setIsPrintModalOpen(false);
        setTimeout(() => {
            printToPdfNative('calendar-print-area', `Kalender_Akademik_${anchorDate.getFullYear()}`);
        }, 500);
    };

    const renderCalendarGrid = () => {
        const gridCells = [];
        if (calendarDays.length === 0) return null;

        const firstDayOfWeek = calendarDays[0].dateObj.getDay(); 
        
        for (let i = 0; i < firstDayOfWeek; i++) {
            gridCells.push(<div key={`empty-${i}`} className="bg-gray-50/50 border border-transparent min-h-[80px]"></div>);
        }
        
        calendarDays.forEach((dayData) => {
            const dateStr = dayData.dateObj.toISOString().split('T')[0];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            
            const dayEvents = monthEvents.filter(e => {
                const dayDate = new Date(dateStr);
                const start = new Date(e.startDate);
                const end = new Date(e.endDate);
                start.setHours(0,0,0,0); end.setHours(0,0,0,0); dayDate.setHours(0,0,0,0);
                return dayDate >= start && dayDate <= end;
            });

            const mainNum = primarySystem === 'Masehi' ? dayData.masehi : dayData.hijriDay;
            const subNum = primarySystem === 'Masehi' ? dayData.hijriDay : dayData.masehi;

            // Fasting Styling
            let fastingClass = '';
            let fastingIcon = null;
            if (showFasting && dayData.isFasting) {
                if (dayData.isRamadan) {
                    fastingClass = 'bg-yellow-50 border-yellow-200';
                    if(mainNum === 1) fastingIcon = <div className="absolute top-1 right-1 text-yellow-600 text-[10px]"><i className="bi bi-moon-stars-fill"></i></div>;
                } else if (dayData.isFasting === 'Ayyamul Bidh') {
                    fastingClass = 'bg-blue-50 border-blue-200';
                    fastingIcon = <div className="absolute top-1 right-1 text-blue-400 text-[8px] opacity-70" title="Ayyamul Bidh"><i className="bi bi-brightness-high-fill"></i></div>;
                } else if (dayData.isFasting === 'Sunnah') {
                    fastingIcon = <div className="absolute top-1 right-1 text-green-400 text-[8px] opacity-50" title="Puasa Senin-Kamis"><i className="bi bi-droplet-fill"></i></div>;
                }
            }

            gridCells.push(
                <div 
                    key={dateStr} 
                    onClick={() => { if(canWrite) { setSelectedDate(dateStr); setEditingEvent(null); setIsEventModalOpen(true); } }}
                    className={`border p-2 min-h-[100px] relative transition-colors ${canWrite ? 'cursor-pointer' : ''} ${fastingClass || 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                    {fastingIcon}
                    <div className="flex justify-between items-start mb-1">
                        <div className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                            {mainNum}
                        </div>
                        <div className={`text-[10px] font-medium ${primarySystem === 'Masehi' ? 'text-teal-600' : 'text-gray-400'}`}>
                            {subNum}
                        </div>
                    </div>
                    <div className="space-y-1">
                        {dayEvents.map(ev => (
                            <div 
                                key={ev.id} 
                                onClick={(e) => { e.stopPropagation(); setEditingEvent(ev); setIsEventModalOpen(true); }}
                                className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white cursor-pointer hover:opacity-80 shadow-sm ${ev.color.startsWith('#') ? '' : ev.color}`}
                                style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}
                                title={ev.title}
                            >
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        });
        
        return gridCells;
    };

    return (
        <div className="min-h-screen pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Kalender & Jadwal</h1>
                    <p className="text-gray-500 text-sm">Akademik, Ibadah, dan Kegiatan Pesantren.</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 sticky top-0 z-40">
                <nav className="flex -mb-px">
                    <button 
                        onClick={() => setActiveView('kalender')} 
                        className={`flex-1 py-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${activeView === 'kalender' ? 'border-teal-500 text-teal-600 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="bi bi-calendar-range text-lg"></i> Kalender Akademik
                    </button>
                    <button 
                        onClick={() => setActiveView('piket')} 
                        className={`flex-1 py-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${activeView === 'piket' ? 'border-teal-500 text-teal-600 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="bi bi-clock-history text-lg"></i> Jadwal Piket Ibadah
                    </button>
                </nav>
            </div>

            {activeView === 'kalender' && (
                <div className="animate-fade-in">
                    {/* Toolbar */}
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                         {/* Toggle Fasting */}
                         <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                            <label className="text-sm text-gray-700 font-medium cursor-pointer select-none flex items-center gap-2">
                                <input type="checkbox" checked={showFasting} onChange={e => setShowFasting(e.target.checked)} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500" />
                                <i className="bi bi-moon-stars text-teal-600"></i>
                                Tampilkan Puasa Sunnah
                            </label>
                        </div>

                         <div className="flex gap-2 ml-auto">
                            <button onClick={() => setIsPrintModalOpen(true)} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center gap-2">
                                <i className="bi bi-printer"></i> Cetak
                            </button>
                            {canWrite && (
                                <div className="flex gap-2">
                                     <button onClick={() => { setIsBulkModalOpen(true); }} className="bg-teal-50 text-teal-700 border border-teal-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-100 flex items-center gap-2">
                                        <i className="bi bi-table"></i> Bulk
                                    </button>
                                    <button onClick={() => { setEditingEvent(null); setSelectedDate(''); setIsEventModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2">
                                        <i className="bi bi-plus-lg"></i> Agenda
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {showFasting && (
                        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-sm text-yellow-800 flex items-start gap-2">
                            <i className="bi bi-info-circle-fill mt-0.5"></i>
                            <div>
                                <strong>Tanbih:</strong> Tanggal Hijriah, Awal Ramadhan, dan Hari Raya dalam kalender ini adalah hasil <em>hisab/estimasi</em> algoritma. 
                                Kepastian tanggal ibadah tetap mengikuti keputusan Sidang Isbat Pemerintah / otoritas setempat.
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end mb-4">
                        <div className="inline-flex bg-white border rounded-lg p-1 shadow-sm">
                            <button 
                                onClick={() => setPrimarySystem('Masehi')}
                                className={`px-3 py-1 text-xs font-bold rounded ${primarySystem === 'Masehi' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Masehi
                            </button>
                            <button 
                                onClick={() => setPrimarySystem('Hijriah')}
                                className={`px-3 py-1 text-xs font-bold rounded ${primarySystem === 'Hijriah' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Hijriah
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <button onClick={handlePrev} className="p-2 hover:bg-gray-200 rounded-full"><i className="bi bi-chevron-left"></i></button>
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-gray-800">{headerInfo.main}</h2>
                                <p className="text-sm text-teal-600 font-medium">{headerInfo.sub}</p>
                            </div>
                            <button onClick={handleNext} className="p-2 hover:bg-gray-200 rounded-full"><i className="bi bi-chevron-right"></i></button>
                        </div>
                        <div className="grid grid-cols-7 bg-gray-100 border-b">
                            {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day, i) => (
                                <div key={day} className={`p-3 text-center font-bold text-sm ${i === 0 ? 'text-red-600' : 'text-gray-600'}`}>{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 bg-gray-200 gap-px border-b">
                            {renderCalendarGrid()}
                        </div>
                    </div>

                    <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Agenda Bulan Ini</h3>
                        {monthEvents.length > 0 ? (
                            <ul className="space-y-3">
                                {[...monthEvents].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(ev => (
                                    <li key={ev.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group">
                                        <div className={`w-3 h-3 rounded-full shrink-0 ${ev.color.startsWith('#') ? '' : ev.color}`} style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}></div>
                                        <div className="flex-grow">
                                            <div className="font-bold text-gray-800 text-sm">{ev.title}</div>
                                            <div className="text-xs text-gray-500">
                                                {formatDate(ev.startDate)} {ev.startDate !== ev.endDate && ` - ${formatDate(ev.endDate)}`}
                                                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase border">{ev.category}</span>
                                            </div>
                                        </div>
                                        {canWrite && (
                                            <button onClick={() => { setEditingEvent(ev); setIsEventModalOpen(true); }} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-400 italic text-sm">Tidak ada agenda di bulan ini.</p>
                        )}
                    </div>
                </div>
            )}

            {activeView === 'piket' && <JadwalPiketView />}

            <EventModal 
                isOpen={isEventModalOpen} 
                onClose={() => setIsEventModalOpen(false)} 
                onSave={handleSaveEvent} 
                onUpdate={handleUpdateEvent} 
                onDelete={handleDeleteEvent}
                eventData={editingEvent}
                selectedDate={selectedDate}
            />

            <BulkEventModal 
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSave={handleBulkSaveEvents}
            />

            <PrintModal 
                isOpen={isPrintModalOpen} 
                onClose={() => setIsPrintModalOpen(false)} 
                onPrint={handlePrintRequest}
                settings={settings}
                events={events}
                year={anchorDate.getFullYear()}
            />

            {/* Hidden Print Area */}
            <div className="hidden print:block">
                {printConfig && (
                    <div id="calendar-print-area">
                        <CalendarPrintTemplate 
                            year={anchorDate.getFullYear()} 
                            events={events} 
                            settings={settings} 
                            theme={printConfig.theme}
                            layout={printConfig.layout}
                            primarySystem={printConfig.primarySystem}
                            showKop={printConfig.showKop}
                            customImage={printConfig.customImage}
                            imagePosition={printConfig.imagePosition}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Kalender;
