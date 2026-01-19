
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { CalendarEvent, PondokSettings } from '../types';
import { printToPdfNative } from '../utils/pdfGenerator';
import { CalendarPrintTemplate } from './kalender/CalendarPrintTemplate';
import { BulkEventModal } from './kalender/modals/BulkEventModal';
import { formatDate, getHijriDate, findStartOfHijriMonth } from '../utils/formatters';

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

// ... (Rest of existing helpers and components)

// --- MAIN COMPONENT ---

const Kalender: React.FC = () => {
    const { showToast, currentUser, settings } = useAppContext();
    const events = useLiveQuery(() => db.calendarEvents.filter(e => !e.deleted).toArray(), []) || [];
    
    // State "anchorDate" selalu menyimpan tanggal referensi untuk grid yang sedang dilihat
    // Jika mode Masehi: anchorDate = Tanggal 1 Bulan Masehi
    // Jika mode Hijriah: anchorDate = Tanggal Masehi yang bertepatan dengan Tanggal 1 Bulan Hijriah
    const [anchorDate, setAnchorDate] = useState(new Date()); 
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); // NEW
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [primarySystem, setPrimarySystem] = useState<'Masehi' | 'Hijriah'>('Masehi');
    
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
            // Set ke tanggal 1 bulan ini
            const now = new Date();
            setAnchorDate(new Date(now.getFullYear(), now.getMonth(), 1));
        } else {
            // Set ke tanggal 1 bulan Hijriah saat ini
            setAnchorDate(findStartOfHijriMonth(new Date(), hijriAdjustment));
        }
    }, [primarySystem, hijriAdjustment]);

    // ... (Existing logic for grid generation, header, navigation, event handling remains unchanged)
    
    // Grid Generation Logic
    const calendarDays = useMemo(() => {
        const days: { dateObj: Date, masehi: number, hijri: string, hijriDay: string }[] = [];
        
        if (primarySystem === 'Masehi') {
            // Logic Masehi (Standard)
            const year = anchorDate.getFullYear();
            const month = anchorDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                const h = getHijriDate(d, hijriAdjustment);
                days.push({
                    dateObj: d,
                    masehi: i,
                    hijri: `${h.month} ${h.year}`,
                    hijriDay: h.day
                });
            }
        } else {
            // Logic Hijriah (Custom Grid)
            const startHijri = getHijriDate(anchorDate, hijriAdjustment);
            const targetHijriMonth = startHijri.month;
            
            let d = new Date(anchorDate);
            for (let i = 0; i < 30; i++) {
                const currentHijri = getHijriDate(d, hijriAdjustment);
                if (currentHijri.month !== targetHijriMonth) break; 

                days.push({
                    dateObj: new Date(d),
                    masehi: d.getDate(),
                    hijri: `${currentHijri.month} ${currentHijri.year}`,
                    hijriDay: currentHijri.day
                });
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
        // Delay to allow render
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

            gridCells.push(
                <div 
                    key={dateStr} 
                    onClick={() => { if(canWrite) { setSelectedDate(dateStr); setEditingEvent(null); setIsEventModalOpen(true); } }}
                    className={`border border-gray-100 p-2 min-h-[100px] bg-white relative hover:bg-gray-50 transition-colors ${canWrite ? 'cursor-pointer' : ''}`}
                >
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
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Kalender Akademik</h1>
                    <p className="text-gray-500 text-sm">Agenda kegiatan pondok pesantren.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsPrintModalOpen(true)} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center gap-2">
                        <i className="bi bi-printer"></i> Cetak / Export
                    </button>
                    {canWrite && (
                        <div className="flex gap-2">
                             <button onClick={() => { setIsBulkModalOpen(true); }} className="bg-teal-50 text-teal-700 border border-teal-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-100 flex items-center gap-2">
                                <i className="bi bi-table"></i> Tambah Massal
                            </button>
                            <button onClick={() => { setEditingEvent(null); setSelectedDate(''); setIsEventModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2">
                                <i className="bi bi-plus-lg"></i> Tambah Agenda
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
