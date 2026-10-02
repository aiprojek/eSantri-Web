
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { CalendarEvent, PondokSettings, PiketSchedule, Santri, PiketPrintConfig } from '../types';
import { printExportFacade } from '../utils/printExportFacade';
import { loadJsPdf, loadJsPdfAutoTable } from '../utils/lazyClientLibs';
import { CalendarPrintTemplate } from './kalender/CalendarPrintTemplate';
import { PiketPrintTemplate } from './kalender/PiketPrintTemplate';
import { BulkEventModal } from './kalender/modals/BulkEventModal';
import { PiketSettingsModal, DEFAULT_KETENTUAN_LIST } from './kalender/modals/PiketSettingsModal';
import { formatDate, getHijriDate, findStartOfHijriMonth, toArabicNumerals, formatLocalDate, resolveTempatPesantren } from '../utils/formatters';
import { getAcademicYearsFromSettings } from '../utils/academicYear';
import { useSantriContext } from '../contexts/SantriContext';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { MobileFilterDrawer } from './common/MobileFilterDrawer';
import { downloadIcsFile } from '../utils/icsExport';
import { exportPiketSchedulePdf } from '../utils/piketPdfExport';

// --- EVENT MODAL ---
interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<CalendarEvent, 'id'>) => Promise<void>;
    onUpdate: (data: CalendarEvent) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    eventData: CalendarEvent | null;
    selectedDate?: string;
    settings: PondokSettings;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, onUpdate, onDelete, eventData, selectedDate, settings }) => {
    const { register, handleSubmit, reset, setValue, watch } = useForm<CalendarEvent>();
    const [selectedJenjang, setSelectedJenjang] = useState<number>(0);
    const [selectedKelas, setSelectedKelas] = useState<number>(0);
    const [selectedRombel, setSelectedRombel] = useState<number>(0);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const availableKelasModal = useMemo(() => {
        if (!selectedJenjang) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === selectedJenjang);
    }, [selectedJenjang, settings.kelas]);

    const availableRombelModal = useMemo(() => {
        if (!selectedKelas) {
            if (!selectedJenjang) return settings.rombel;
            const kIds = availableKelasModal.map(k => k.id);
            return settings.rombel.filter(r => kIds.includes(r.kelasId));
        }
        return settings.rombel.filter(r => r.kelasId === selectedKelas);
    }, [selectedKelas, selectedJenjang, availableKelasModal, settings.rombel]);

    React.useEffect(() => {
        if (isOpen) {
            setConfirmDelete(false);
            if (eventData) {
                reset(eventData);
                setSelectedJenjang(eventData.jenjangId || 0);
                setSelectedKelas(eventData.kelasId || 0);
                setSelectedRombel(eventData.rombelId || 0);
            } else {
                reset({
                    title: '',
                    startDate: selectedDate || formatLocalDate(new Date()),
                    endDate: selectedDate || formatLocalDate(new Date()),
                    category: 'Kegiatan',
                    color: 'bg-blue-500',
                    description: '',
                    jenjangId: undefined,
                    kelasId: undefined,
                    rombelId: undefined,
                });
                setSelectedJenjang(0);
                setSelectedKelas(0);
                setSelectedRombel(0);
            }
        }
    }, [isOpen, eventData, selectedDate, reset]);

    const onSubmit = async (data: CalendarEvent) => {
        const payload: any = {
            ...data,
            jenjangId: selectedJenjang || undefined,
            kelasId: selectedKelas || undefined,
            rombelId: selectedRombel || undefined,
        };
        if (eventData?.id) {
            await onUpdate({ ...payload, id: eventData.id });
        } else {
            await onSave(payload);
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-calendar-event text-teal-600"></i>
                        {eventData ? 'Edit Agenda' : 'Tambah Agenda'}
                    </h3>
                    <button onClick={onClose}><i className="bi bi-x-lg text-gray-500 hover:text-gray-700"></i></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nama Kegiatan <span className="text-red-500">*</span></label>
                        <input type="text" {...register('title', { required: true })} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" placeholder="Contoh: Ujian Akhir Semester / Libur Puasa" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Mulai <span className="text-red-500">*</span></label>
                            <input type="date" {...register('startDate', { required: true })} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-700 mb-1">Selesai <span className="text-red-500">*</span></label>
                            <input type="date" {...register('endDate', { required: true })} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                    </div>
                    
                    {/* Target Scope: Jenjang, Kelas, Rombel */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                            <i className="bi bi-diagram-3 mr-1 text-teal-600"></i> Target Jenjang / Kelas / Rombel (Opsional)
                        </label>
                        <p className="text-[11px] text-gray-500">Biarkan "Umum / Semua" jika agenda berlaku untuk seluruh santri.</p>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">Jenjang</label>
                                <select 
                                    value={selectedJenjang} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        setSelectedJenjang(val);
                                        setSelectedKelas(0);
                                        setSelectedRombel(0);
                                    }} 
                                    className="w-full border rounded-lg p-2 text-xs bg-white"
                                >
                                    <option value={0}>Semua Jenjang</option>
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">Kelas</label>
                                <select 
                                    value={selectedKelas} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        setSelectedKelas(val);
                                        setSelectedRombel(0);
                                    }} 
                                    className="w-full border rounded-lg p-2 text-xs bg-white"
                                >
                                    <option value={0}>Semua Kelas</option>
                                    {availableKelasModal.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-0.5">Rombel</label>
                                <select 
                                    value={selectedRombel} 
                                    onChange={e => setSelectedRombel(Number(e.target.value))} 
                                    className="w-full border rounded-lg p-2 text-xs bg-white"
                                >
                                    <option value={0}>Semua Rombel</option>
                                    {availableRombelModal.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                            <select {...register('category')} className="w-full border rounded-lg p-2 text-sm bg-white">
                                <option value="Kegiatan">Kegiatan</option>
                                <option value="Ujian">Ujian</option>
                                <option value="Libur">Libur</option>
                                <option value="Rapat">Rapat</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Warna Label</label>
                            <div className="flex flex-wrap gap-2 pt-1">
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
                        <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi & Catatan (Opsional)</label>
                        <textarea {...register('description')} rows={2} className="w-full border rounded-lg p-2 text-sm" placeholder="Rincian tempat, pakaian, atau instruksi..."></textarea>
                    </div>
                    
                    <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-2">
                        {eventData ? (
                            confirmDelete ? (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                                    <span className="text-xs text-red-700 font-semibold">Hapus agenda ini?</span>
                                    <button 
                                        type="button" 
                                        onClick={async () => { await onDelete(eventData.id); onClose(); }} 
                                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-xs"
                                    >
                                        Ya, Hapus
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setConfirmDelete(false)} 
                                        className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded text-xs font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setConfirmDelete(true)} 
                                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        <i className="bi bi-trash"></i> Hapus
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => downloadIcsFile([eventData], `agenda-${eventData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, settings.namaPonpes)} 
                                        className="px-3 py-2 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        title="Export agenda ini ke file iCalendar (.ics) untuk Google Calendar / Outlook"
                                    >
                                        <i className="bi bi-calendar2-event"></i> Export .ics
                                    </button>
                                </div>
                            )
                        ) : <div />}

                        <div className="flex items-center gap-2 ml-auto">
                            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium">Batal</button>
                            <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 shadow-sm">Simpan</button>
                        </div>
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
    onExportPdfTable: (options: any, mode?: 'print' | 'pdf' | 'pdf_table' | 'html') => void;
    settings: PondokSettings;
    events: CalendarEvent[];
    year: number;
    isProcessing?: boolean;
}

const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, onExportPdfTable, settings, events, year, isProcessing = false }) => {
    const [theme, setTheme] = useState<'classic' | 'modern' | 'bold' | 'dark' | 'ceria'>('classic');
    const [layout, setLayout] = useState<'1_sheet' | '3_sheets' | '4_sheets'>('1_sheet');
    const [primarySystem, setPrimarySystem] = useState<'Masehi' | 'Hijriah'>('Masehi');
    const [showKop, setShowKop] = useState(true);
    const [showAgendaAppendix, setShowAgendaAppendix] = useState(true);
    const [useAcademicPeriodLabel, setUseAcademicPeriodLabel] = useState(true);
    const [activeTab, setActiveTab] = useState<'settings' | 'theme' | 'images'>('settings');
    const [mobileView, setMobileView] = useState<'config' | 'preview'>('config');
    const [zoomScale, setZoomScale] = useState(() => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth < 640) return 0.35;
            if (window.innerWidth < 1024) return 0.45;
        }
        return 0.5;
    });

    const handleFitZoom = useCallback(() => {
        if (!previewRef.current) return;
        const containerWidth = previewRef.current.clientWidth - 24;
        const docWidth = layout === '1_sheet' ? 1123 : 794;
        const fitScale = Math.min(1.0, Math.max(0.2, Number((containerWidth / docWidth).toFixed(2))));
        setZoomScale(fitScale);
    }, [layout]);

    // Range State
    const [startMonth, setStartMonth] = useState(0);
    const [startYear, setStartYear] = useState(year);
    const [endMonth, setEndMonth] = useState(11);
    const [endYear, setEndYear] = useState(year);
    const normalizedAcademicYears = useMemo(() => getAcademicYearsFromSettings(settings), [settings]);
    const activeAcademicYear = useMemo(() => {
        const byFlag = normalizedAcademicYears.find((y) => y.isActive);
        if (byFlag) return byFlag;

        const byPsbLabel = settings.psbConfig?.tahunAjaranAktif
            ? normalizedAcademicYears.find((y) => y.labelMasehi === settings.psbConfig?.tahunAjaranAktif)
            : undefined;
        if (byPsbLabel) return byPsbLabel;

        return normalizedAcademicYears[0];
    }, [normalizedAcademicYears, settings.psbConfig?.tahunAjaranAktif]);

    // Image State
    const [customImage, setCustomImage] = useState<string>('');
    const [imagePosition, setImagePosition] = useState<'banner' | 'watermark' | 'none'>('none');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const previewRef = useRef<HTMLDivElement>(null);

    const HIJRI_MONTH_ALIASES: Record<string, number> = {
        muharram: 1, safar: 2, rabiulawal: 3, rabiulawwal: 3, "rabi'ulawwal": 3, rabiulakhir: 4, "rabi'ulakhir": 4,
        jumadilawal: 5, jumadilula: 5, jumadilakhir: 6, jumadilakhira: 6, rajab: 7, syaban: 8, syaaban: 8, "sya'ban": 8,
        ramadhan: 9, ramadan: 9, syawal: 10, syawwal: 10, dzulqadah: 11, "dzulqa'dah": 11, dzulhijjah: 12
    };
    const normalizeText = (value: unknown) =>
        String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9']/g, '');
    const toNumber = (value: unknown): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
        return undefined;
    };
    const toHijriMonthNumber = (value: unknown): number | undefined => {
        const numeric = toNumber(value);
        if (numeric !== undefined) return numeric;
        const normalized = normalizeText(value);
        return HIJRI_MONTH_ALIASES[normalized];
    };
    const academicHijriStart = useMemo(() => {
        if (!activeAcademicYear) return { monthIndex: undefined as number | undefined, year: undefined as number | undefined };
        const monthNum = toHijriMonthNumber((activeAcademicYear as any).hijriStartMonth) ??
            toHijriMonthNumber((activeAcademicYear as any).startHijriMonth) ??
            toHijriMonthNumber((activeAcademicYear as any).hijrahStartMonth);
        const yearNum = toNumber((activeAcademicYear as any).hijriStartYear) ??
            toNumber((activeAcademicYear as any).startHijriYear);
        if (monthNum === undefined || yearNum === undefined) return { monthIndex: undefined, year: undefined };
        return { monthIndex: monthNum >= 1 && monthNum <= 12 ? monthNum - 1 : monthNum, year: yearNum };
    }, [activeAcademicYear]);

    const applyActiveAcademicYear = useCallback(() => {
        if (!activeAcademicYear) return;
        const parseYearsFromHijriLabel = (label?: string): { start?: number; end?: number } => {
            if (!label) return {};
            const matches = label.match(/\d{4}/g);
            if (!matches || matches.length === 0) return {};
            const start = Number(matches[0]);
            const end = Number(matches[matches.length - 1] || matches[0]);
            return {
                start: Number.isFinite(start) ? start : undefined,
                end: Number.isFinite(end) ? end : undefined,
            };
        };
        const normalizeMonthIndex = (value?: number, fallback = 0) => {
            if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
            if (value >= 1 && value <= 12) return value - 1; // Data Master format
            if (value >= 0 && value <= 11) return value; // Legacy/index format
            return fallback;
        };
        const labelYears = parseYearsFromHijriLabel((activeAcademicYear as any).labelHijriah);
        const hijriStartMonthRaw =
            toHijriMonthNumber((activeAcademicYear as any).hijriStartMonth) ??
            toHijriMonthNumber((activeAcademicYear as any).startHijriMonth) ??
            toHijriMonthNumber((activeAcademicYear as any).hijrahStartMonth);
        const hijriStartYearRaw =
            toNumber((activeAcademicYear as any).hijriStartYear) ??
            toNumber((activeAcademicYear as any).startHijriYear) ??
            labelYears.start;
        const hijriEndMonthRaw =
            toHijriMonthNumber((activeAcademicYear as any).hijriEndMonth) ??
            toHijriMonthNumber((activeAcademicYear as any).endHijriMonth) ??
            toHijriMonthNumber((activeAcademicYear as any).hijrahEndMonth);
        const hijriEndYearRaw =
            toNumber((activeAcademicYear as any).hijriEndYear) ??
            toNumber((activeAcademicYear as any).endHijriYear) ??
            labelYears.end;
        const hasHijriRange =
            hijriStartMonthRaw !== undefined &&
            hijriStartYearRaw !== undefined &&
            hijriEndMonthRaw !== undefined &&
            hijriEndYearRaw !== undefined;

        if (primarySystem === 'Hijriah' && hasHijriRange) {
            const hijriStartMonth = hijriStartMonthRaw as number;
            const hijriStartYear = hijriStartYearRaw as number;
            const hijriEndMonth = hijriEndMonthRaw as number;
            const hijriEndYear = hijriEndYearRaw as number;
            setStartMonth(normalizeMonthIndex(hijriStartMonth, 0));
            setStartYear(hijriStartYear);
            setEndMonth(normalizeMonthIndex(hijriEndMonth, 11));
            setEndYear(hijriEndYear);
            return;
        }

        if (primarySystem === 'Hijriah') {
            // Jangan pernah fallback ke rentang Masehi saat mode Hijriah aktif.
            const h = getHijriDate(new Date(), settings.hijriAdjustment || 0);
            const currentHijriYear = parseInt(h.year) || 1447;
            setStartMonth(0);
            setEndMonth(11);
            setStartYear(currentHijriYear);
            setEndYear(currentHijriYear);
            return;
        }

        setStartMonth(normalizeMonthIndex(toNumber((activeAcademicYear as any).masehiStartMonth), 0));
        setStartYear(toNumber((activeAcademicYear as any).masehiStartYear) || new Date().getFullYear());
        setEndMonth(normalizeMonthIndex(toNumber((activeAcademicYear as any).masehiEndMonth), 11));
        setEndYear(toNumber((activeAcademicYear as any).masehiEndYear) || new Date().getFullYear());
        setUseAcademicPeriodLabel(true);
    }, [activeAcademicYear, primarySystem, settings.hijriAdjustment]);

    // Sync rentang saat sistem berubah:
    // 1) prioritas rentang Tahun Ajaran Aktif jika ada,
    // 2) fallback ke tahun berjalan sesuai sistem.
    useEffect(() => {
        if (activeAcademicYear) {
            applyActiveAcademicYear();
            return;
        }
        if (primarySystem === 'Hijriah') {
            const h = getHijriDate(new Date(), settings.hijriAdjustment || 0);
            const hYear = parseInt(h.year);
            setStartYear(hYear);
            setEndYear(hYear);
        } else {
            const mYear = new Date().getFullYear();
            setStartYear(mYear);
            setEndYear(mYear);
        }
    }, [primarySystem, settings.hijriAdjustment, activeAcademicYear, applyActiveAcademicYear]);

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
            className={`w-full px-3 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === id ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
        >
            <i className={`bi ${icon}`}></i> {label}
        </button>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/75 z-[80] flex justify-center items-center p-2 sm:p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 sm:py-3.5 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-printer-fill text-teal-600"></i> Cetak Kalender
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition-colors"
                        title="Tutup Jendela"
                    >
                        <i className="bi bi-x-lg text-lg sm:text-xl"></i>
                    </button>
                </div>

                {/* Mobile / Tablet View Switcher (< lg) */}
                <div className="lg:hidden px-3 py-2 bg-gray-100 border-b flex items-center justify-between shrink-0">
                    <div className="flex bg-gray-200/90 p-1 rounded-xl w-full gap-1">
                        <button
                            type="button"
                            onClick={() => setMobileView('config')}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                mobileView === 'config'
                                    ? 'bg-white text-teal-800 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <i className="bi bi-sliders2"></i>
                            <span>Pengaturan &amp; Ekspor</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMobileView('preview');
                                setTimeout(handleFitZoom, 150);
                            }}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                mobileView === 'preview'
                                    ? 'bg-white text-teal-800 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <i className="bi bi-eye"></i>
                            <span>Pratinjau Kalender</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                    {/* Left: Configuration Panel */}
                    <div className={`w-full lg:w-1/3 border-r flex-col bg-white overflow-hidden ${
                        mobileView === 'config' ? 'flex flex-1 min-h-0' : 'hidden lg:flex'
                    }`}>
                        <div className="border-b">
                            <div className="p-3 lg:hidden">
                                <label className="sr-only" htmlFor="calendar-print-tab-select">Tab Pengaturan</label>
                                <select
                                    id="calendar-print-tab-select"
                                    value={activeTab}
                                    onChange={(e) => setActiveTab(e.target.value as 'settings' | 'theme' | 'images')}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                                >
                                    <option value="settings">Pengaturan</option>
                                    <option value="theme">Tampilan</option>
                                    <option value="images">Gambar</option>
                                </select>
                            </div>
                            <div className="hidden lg:grid lg:grid-cols-3">
                                <TabButton id="settings" label="Pengaturan" icon="bi-sliders" />
                                <TabButton id="theme" label="Tampilan" icon="bi-palette" />
                                <TabButton id="images" label="Gambar" icon="bi-image" />
                            </div>
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
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setShowKop(!showKop)}>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${showKop ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-400'}`}>
                                                    {showKop && <i className="bi bi-check"></i>}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-800">Tampilkan Kop Surat</div>
                                                    <div className="text-xs text-gray-500">Logo, Nama Pondok, dan Alamat di bagian atas.</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setShowAgendaAppendix(!showAgendaAppendix)}>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${showAgendaAppendix ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-400'}`}>
                                                    {showAgendaAppendix && <i className="bi bi-check"></i>}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-800">Lampiran Rekapitulasi Lengkap Agenda</div>
                                                    <div className="text-xs text-gray-500">Sertakan lembar tabel lengkap seluruh agenda pendidikan tanpa ada yang disembunyikan.</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                                        <h4 className="text-sm font-bold text-blue-800">Rentang Cetak / PDF</h4>
                                        <p className="text-xs text-blue-700">Atur rentang bulan di sini. Sistem kalender mengikuti pilihan Penanggalan Utama di atas.</p>
                                        {activeAcademicYear && (
                                            <button
                                                onClick={applyActiveAcademicYear}
                                                className="w-full py-2 px-3 rounded-lg border border-blue-300 bg-white text-blue-700 text-sm font-bold hover:bg-blue-100 transition-colors"
                                            >
                                                Gunakan Tahun Ajaran Aktif ({primarySystem === 'Hijriah' && activeAcademicYear.labelHijriah ? activeAcademicYear.labelHijriah : activeAcademicYear.labelMasehi})
                                            </button>
                                        )}

                                        {primarySystem === 'Masehi' ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bulan Mulai</label>
                                                        <select value={startMonth} onChange={e => { setStartMonth(Number(e.target.value)); setUseAcademicPeriodLabel(false); }} className="w-full p-2 border rounded text-sm">
                                                            {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => <option key={i} value={i}>{m}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tahun Mulai</label>
                                                        <input type="number" value={startYear} onChange={e => { setStartYear(Number(e.target.value)); setUseAcademicPeriodLabel(false); }} className="w-full p-2 border rounded text-sm" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bulan Selesai</label>
                                                        <select value={endMonth} onChange={e => { setEndMonth(Number(e.target.value)); setUseAcademicPeriodLabel(false); }} className="w-full p-2 border rounded text-sm">
                                                            {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => <option key={i} value={i}>{m}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tahun Selesai</label>
                                                        <input type="number" value={endYear} onChange={e => { setEndYear(Number(e.target.value)); setUseAcademicPeriodLabel(false); }} className="w-full p-2 border rounded text-sm" />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bulan Hijriah Mulai</label>
                                                        <select value={startMonth} onChange={e => { setStartMonth(Number(e.target.value)); setUseAcademicPeriodLabel(false); }} className="w-full p-2 border rounded text-sm">
                                                            {["Muharram", "Safar", "Rabi'ul Awwal", "Rabi'ul Akhir", "Jumadil Ula", "Jumadil Akhira", "Rajab", "Sya'ban", "Ramadhan", "Syawwal", "Dzulqa'dah", "Dzulhijjah"].map((m, i) => <option key={i} value={i}>{m}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tahun Hijriah Mulai</label>
                                                        <input type="number" value={startYear} onChange={e => { setStartYear(Number(e.target.value)); setUseAcademicPeriodLabel(false); }} className="w-full p-2 border rounded text-sm" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bulan Hijriah Selesai</label>
                                                        <select value={endMonth} onChange={e => { setEndMonth(Number(e.target.value)); setUseAcademicPeriodLabel(false); }} className="w-full p-2 border rounded text-sm">
                                                            {["Muharram", "Safar", "Rabi'ul Awwal", "Rabi'ul Akhir", "Jumadil Ula", "Jumadil Akhira", "Rajab", "Sya'ban", "Ramadhan", "Syawwal", "Dzulqa'dah", "Dzulhijjah"].map((m, i) => <option key={i} value={i}>{m}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tahun Hijriah Selesai</label>
                                                        <input type="number" value={endYear} onChange={e => { setEndYear(Number(e.target.value)); setUseAcademicPeriodLabel(false); }} className="w-full p-2 border rounded text-sm" />
                                                    </div>
                                                </div>
                                            </>
                                        )}
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

                        <div className="p-3.5 sm:p-4 border-t bg-gray-50 flex flex-col gap-2 shrink-0">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <i className="bi bi-box-arrow-up-right text-teal-600"></i>
                                    Pilih Aksi Cetak &amp; Export
                                </label>
                                {isProcessing && (
                                    <span className="text-xs font-semibold text-teal-700 flex items-center gap-1.5 animate-pulse">
                                        <i className="bi bi-arrow-repeat animate-spin"></i> Memproses...
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                {/* Tombol Export PDF Vektor Resmi */}
                                <button 
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => onExportPdfTable({
                                        startMonth, startYear, endMonth, endYear, primarySystem, showKop, showAgendaAppendix, theme, layout, customImage, imagePosition,
                                        periodLabelMasehi: activeAcademicYear?.labelMasehi,
                                        periodLabelHijriah: activeAcademicYear?.labelHijriah,
                                        useAcademicPeriodLabel,
                                        academicHijriStartMonthIndex: academicHijriStart.monthIndex,
                                        academicHijriStartYear: academicHijriStart.year
                                    }, 'pdf_table')}
                                    className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-60"
                                    title="Export dokumen PDF Vektor resmi dengan tabel rapi, angka Arab, dan lampiran agenda"
                                >
                                    <i className="bi bi-file-earmark-pdf-fill text-base"></i>
                                    <span>Export PDF</span>
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                    {/* Tombol Cetak Langsung */}
                                    <button 
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => onExportPdfTable({
                                            startMonth, startYear, endMonth, endYear, primarySystem, showKop, showAgendaAppendix, theme, layout, customImage, imagePosition,
                                            periodLabelMasehi: activeAcademicYear?.labelMasehi,
                                            periodLabelHijriah: activeAcademicYear?.labelHijriah,
                                            useAcademicPeriodLabel,
                                            academicHijriStartMonthIndex: academicHijriStart.monthIndex,
                                            academicHijriStartYear: academicHijriStart.year
                                        }, 'print')}
                                        className="w-full py-2 px-3 bg-gray-800 hover:bg-gray-900 active:bg-black text-white rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 text-xs disabled:opacity-60"
                                        title="Buka dialog cetak browser langsung"
                                    >
                                        <i className="bi bi-printer-fill text-sm"></i>
                                        <span>Cetak Dokumen</span>
                                    </button>

                                    {/* Tombol HTML */}
                                    <button 
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => onExportPdfTable({
                                            startMonth, startYear, endMonth, endYear, primarySystem, showKop, showAgendaAppendix, theme, layout, customImage, imagePosition,
                                            periodLabelMasehi: activeAcademicYear?.labelMasehi,
                                            periodLabelHijriah: activeAcademicYear?.labelHijriah,
                                            useAcademicPeriodLabel,
                                            academicHijriStartMonthIndex: academicHijriStart.monthIndex,
                                            academicHijriStartYear: academicHijriStart.year
                                        }, 'html')}
                                        className="w-full py-2 px-3 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-700 border border-gray-300 rounded-xl font-semibold shadow-2xs transition-all flex items-center justify-center gap-1.5 text-xs disabled:opacity-60"
                                        title="Download berkas HTML mandiri untuk arsip offline"
                                    >
                                        <i className="bi bi-filetype-html text-sm text-amber-600"></i>
                                        <span>Export HTML</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className={`w-full lg:w-2/3 bg-gray-200 relative overflow-hidden flex-col ${
                        mobileView === 'preview' ? 'flex flex-1 min-h-0' : 'hidden lg:flex'
                    }`}>
                        {/* Top Zoom Controls */}
                        <div className="py-2 px-3 sm:px-4 bg-white/95 border-b flex items-center justify-between shrink-0 gap-2">
                            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg border border-gray-200">
                                <button 
                                    type="button"
                                    onClick={() => setZoomScale(z => Math.max(0.2, Number((z - 0.05).toFixed(2))))} 
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-md text-gray-700 transition-colors"
                                    title="Perkecil Zoom"
                                >
                                    <i className="bi bi-dash-lg text-xs"></i>
                                </button>
                                <span className="text-xs font-mono font-bold w-12 text-center text-gray-800">
                                    {Math.round(zoomScale * 100)}%
                                </span>
                                <button 
                                    type="button"
                                    onClick={() => setZoomScale(z => Math.min(1.5, Number((z + 0.05).toFixed(2))))} 
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-md text-gray-700 transition-colors"
                                    title="Perbesar Zoom"
                                >
                                    <i className="bi bi-plus-lg text-xs"></i>
                                </button>
                                <div className="h-4 w-px bg-gray-300"></div>
                                <button 
                                    type="button"
                                    onClick={handleFitZoom}
                                    className="px-2 py-0.5 text-[11px] font-bold text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
                                    title="Sesuaikan ukuran dengan layar"
                                >
                                    Paskan
                                </button>
                            </div>

                            <div className="text-[11px] text-gray-500 hidden sm:block truncate font-medium">
                                Layout: {layout === '1_sheet' ? '1 Lembar (12 Bulan)' : layout === '3_sheets' ? '3 Lembar' : '4 Lembar'}
                            </div>
                        </div>
                        
                        <div className="flex-grow overflow-auto p-2 sm:p-4 md:p-6 lg:p-8 flex justify-center items-start custom-scrollbar max-w-full" ref={previewRef}>
                            <div 
                                className="origin-top transition-transform duration-200 ease-out bg-white shadow-xl max-w-full"
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
                                    showAgendaAppendix={showAgendaAppendix}
                                    customImage={customImage}
                                    imagePosition={imagePosition}
                                    startMonth={startMonth}
                                    startYear={startYear}
                                    endMonth={endMonth}
                                    endYear={endYear}
                                    periodLabelMasehi={activeAcademicYear?.labelMasehi}
                                    periodLabelHijriah={activeAcademicYear?.labelHijriah}
                                    useAcademicPeriodLabel={useAcademicPeriodLabel}
                                    academicHijriStartMonthIndex={academicHijriStart.monthIndex}
                                    academicHijriStartYear={academicHijriStart.year}
                                />
                            </div>
                        </div>

                        {/* Mobile Quick Action Bar (inside Preview tab on phone/tablet) */}
                        <div className="lg:hidden p-3 bg-white/95 border-t backdrop-blur flex items-center justify-between gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setMobileView('config')}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                            >
                                <i className="bi bi-sliders2"></i>
                                <span>Atur Format</span>
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => onExportPdfTable({
                                        startMonth, startYear, endMonth, endYear, primarySystem, showKop, showAgendaAppendix, theme, layout, customImage, imagePosition,
                                        periodLabelMasehi: activeAcademicYear?.labelMasehi,
                                        periodLabelHijriah: activeAcademicYear?.labelHijriah,
                                        useAcademicPeriodLabel,
                                        academicHijriStartMonthIndex: academicHijriStart.monthIndex,
                                        academicHijriStartYear: academicHijriStart.year
                                    }, 'print')}
                                    className="px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                                    title="Cetak langsung"
                                >
                                    <i className="bi bi-printer"></i>
                                    <span>Cetak</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => onExportPdfTable({
                                        startMonth, startYear, endMonth, endYear, primarySystem, showKop, showAgendaAppendix, theme, layout, customImage, imagePosition,
                                        periodLabelMasehi: activeAcademicYear?.labelMasehi,
                                        periodLabelHijriah: activeAcademicYear?.labelHijriah,
                                        useAcademicPeriodLabel,
                                        academicHijriStartMonthIndex: academicHijriStart.monthIndex,
                                        academicHijriStartYear: academicHijriStart.year
                                    }, 'pdf_table')}
                                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                                    title="Export PDF"
                                >
                                    <i className="bi bi-file-earmark-pdf-fill"></i>
                                    <span>Export PDF</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur text-xs text-gray-500 p-2 text-center border-t hidden lg:block">
                            Preview ini adalah simulasi. Hasil cetak PDF memiliki resolusi vektor tajam dan margin presisi.
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

// --- TAB JADWAL PIKET (ENHANCED) ---
const JadwalPiketView: React.FC = () => {
    const { settings, showToast, showConfirmation, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keasramaan === 'write'; 

    const [piketMode, setPiketMode] = useState<'weekly' | 'daily'>('weekly');
    const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
    const [currentWeekRefDate, setCurrentWeekRefDate] = useState(new Date());
    const [piketList, setPiketList] = useState<PiketSchedule[]>([]);
    const [isPrinting, setIsPrinting] = useState(false);
    const defaultKota = useMemo(() => resolveTempatPesantren(settings), [settings]);
    
    // Pengaturan Khusus Format Cetak Piket (Tempat, Penanda Tangan, Ketentuan Sholat)
    const [piketConfig, setPiketConfig] = useState<PiketPrintConfig>(() => {
        try {
            const saved = localStorage.getItem('esantri_piket_print_config');
            if (saved) return JSON.parse(saved);
        } catch {}
        return {
            tempat: '',
            leftTitle: 'Pengasuh / Pimpinan Pondok',
            leftName: settings.namaMudir || '',
            rightTitle: 'Bagian Keasramaan & Ibadah',
            rightName: '',
            judulKetentuan: 'KETENTUAN PETUGAS SHOLAT FARDHU:',
            ketentuanList: DEFAULT_KETENTUAN_LIST,
            showKetentuan: true,
            showTandaTangan: true
        };
    });
    const [isPiketSettingsOpen, setIsPiketSettingsOpen] = useState(false);
    const activeTempat = piketConfig.tempat?.trim() || defaultKota;

    const handleSavePiketConfig = (newConfig: PiketPrintConfig) => {
        setPiketConfig(newConfig);
        try {
            localStorage.setItem('esantri_piket_print_config', JSON.stringify(newConfig));
        } catch {}
        setIsPiketSettingsOpen(false);
        showToast('Pengaturan cetak & format piket berhasil disimpan.', 'success');
    };
    
    // Modal Selector State
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<{ id: number | null, tanggal: string, sholat: string, field: 'muadzinSantriId' | 'imamSantriId' } | null>(null);

    const sholatList = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const;
    const daysName = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const getWeekDates = useCallback((targetDate: Date): string[] => {
        const d = new Date(targetDate);
        const day = d.getDay(); // 0 is Sunday, 1 is Monday
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(d);
        monday.setDate(d.getDate() + diffToMonday);
        
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
            const cur = new Date(monday);
            cur.setDate(monday.getDate() + i);
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, '0');
            const dt = String(cur.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${dt}`);
        }
        return dates;
    }, []);

    const weekDates = useMemo(() => getWeekDates(currentWeekRefDate), [currentWeekRefDate, getWeekDates]);

    const activeDates = useMemo(() => {
        return piketMode === 'weekly' ? weekDates : [selectedDate];
    }, [piketMode, weekDates, selectedDate]);

    const fetchPiketData = useCallback(async () => {
        if (activeDates.length === 1) {
            const data = await db.piketSchedules.where('tanggal').equals(activeDates[0]).toArray();
            setPiketList(data);
        } else {
            const data = await db.piketSchedules.where('tanggal').anyOf(activeDates).toArray();
            setPiketList(data);
        }
    }, [activeDates]);

    useEffect(() => {
        fetchPiketData();
    }, [fetchPiketData]);

    const handleOpenSelector = (tanggal: string, sholat: string, field: 'muadzinSantriId' | 'imamSantriId') => {
        if (!canWrite) return;
        const existing = piketList.find(p => p.tanggal === tanggal && p.sholat === sholat);
        setEditingSlot({ id: existing ? existing.id : null, tanggal, sholat, field });
        setSelectorOpen(true);
    };

    const handleSelectSantri = async (santriId: number | null) => {
        setSelectorOpen(false);
        if (!editingSlot) return;

        const { id, tanggal, sholat, field } = editingSlot;
        
        if (id) {
            await db.piketSchedules.update(id, { [field]: santriId || undefined, lastModified: Date.now() });
            setPiketList(prev => prev.map(p => p.id === id ? { ...p, [field]: santriId || undefined } : p));
        } else {
            const newItem: PiketSchedule = {
                id: Date.now(),
                tanggal,
                sholat: sholat as any,
                [field]: santriId || undefined,
                lastModified: Date.now()
            };
            await db.piketSchedules.add(newItem);
            setPiketList(prev => [...prev, newItem]);
        }
    };

    const handleAutoGenerateDaily = () => {
        if (!canWrite) return;
        showConfirmation('Generate Otomatis Hari Ini?', 'Sistem akan memilih santri putra secara acak untuk mengisi jadwal yang kosong pada tanggal ini.', async () => {
            const activeSantri = santriList.filter(s => s.status === 'Aktif' && s.jenisKelamin === 'Laki-laki');
            if (activeSantri.length < 5) {
                showToast('Jumlah santri putra kurang dari 5, tidak cukup untuk generate.', 'error');
                return;
            }

            const shuffled = [...activeSantri].sort(() => Math.random() - 0.5);
            const updates = [];
            for (let idx = 0; idx < sholatList.length; idx++) {
                const sholat = sholatList[idx];
                const existing = piketList.find(p => p.tanggal === selectedDate && p.sholat === sholat);
                const randomMuadzin = shuffled[idx % shuffled.length];
                const randomImam = shuffled[(idx + 2) % shuffled.length];
                
                if (!existing) {
                    updates.push(db.piketSchedules.add({
                        id: Date.now() + Math.random(),
                        tanggal: selectedDate,
                        sholat,
                        muadzinSantriId: randomMuadzin.id,
                        imamSantriId: randomImam.id,
                        lastModified: Date.now()
                    } as PiketSchedule));
                } else {
                    const patch: Partial<PiketSchedule> = { lastModified: Date.now() };
                    if (!existing.muadzinSantriId) patch.muadzinSantriId = randomMuadzin.id;
                    if (!existing.imamSantriId) patch.imamSantriId = randomImam.id;
                    updates.push(db.piketSchedules.update(existing.id, patch));
                }
            }
            await Promise.all(updates);
            await fetchPiketData();
            showToast('Jadwal piket harian berhasil digenerate.', 'success');
        }, { confirmColor: 'blue' });
    };

    const handleAutoGenerateWeekly = () => {
        if (!canWrite) return;
        showConfirmation('Generate Otomatis 1 Minggu?', 'Sistem akan merotasi santri putra untuk mengisi seluruh jadwal sholat 7 hari dalam minggu ini.', async () => {
            const activeSantri = santriList.filter(s => s.status === 'Aktif' && s.jenisKelamin === 'Laki-laki');
            if (activeSantri.length < 5) {
                showToast('Jumlah santri putra kurang dari 5, tidak cukup untuk generate mingguan.', 'error');
                return;
            }

            const shuffled = [...activeSantri].sort(() => Math.random() - 0.5);
            let santriIdx = 0;
            const updates = [];

            for (const dateStr of weekDates) {
                for (const sholat of sholatList) {
                    const existing = piketList.find(p => p.tanggal === dateStr && p.sholat === sholat);
                    const muadzin = shuffled[santriIdx % shuffled.length];
                    santriIdx++;
                    const imam = shuffled[santriIdx % shuffled.length];
                    santriIdx++;

                    if (!existing) {
                        updates.push(db.piketSchedules.add({
                            id: Date.now() + Math.random() + santriIdx,
                            tanggal: dateStr,
                            sholat,
                            muadzinSantriId: muadzin.id,
                            imamSantriId: imam.id,
                            lastModified: Date.now()
                        } as PiketSchedule));
                    } else {
                        const patch: Partial<PiketSchedule> = { lastModified: Date.now() };
                        if (!existing.muadzinSantriId) patch.muadzinSantriId = muadzin.id;
                        if (!existing.imamSantriId) patch.imamSantriId = imam.id;
                        updates.push(db.piketSchedules.update(existing.id, patch));
                    }
                }
            }

            await Promise.all(updates);
            await fetchPiketData();
            showToast('Jadwal piket mingguan berhasil digenerate merata.', 'success');
        }, { confirmColor: 'blue' });
    };

    const handleClearWeekly = () => {
        if (!canWrite) return;
        showConfirmation('Kosongkan Jadwal Minggu Ini?', 'Semua petugas sholat pada minggu yang dipilih akan dihapus.', async () => {
            const idsToDelete = piketList.filter(p => weekDates.includes(p.tanggal)).map(p => p.id);
            if (idsToDelete.length > 0) {
                await db.piketSchedules.bulkDelete(idsToDelete);
            }
            await fetchPiketData();
            showToast('Jadwal minggu ini telah dikosongkan.', 'success');
        }, { confirmColor: 'red', isDestructive: true });
    };

    const handlePrintWeekly = async () => {
        if (isPrinting) return;
        setIsPrinting(true);
        try {
            await printExportFacade.printDialog({
                elementId: 'piket-weekly-print-area',
                fileName: `Jadwal_Piket_${weekDates[0]}_sd_${weekDates[6]}`,
                paperSize: 'A4',
                target: 'jadwal',
            });
        } finally {
            setIsPrinting(false);
        }
    };

    const handleDownloadPdfWeekly = async (orientation: 'landscape' | 'portrait' = 'landscape') => {
        if (isPrinting) return;
        setIsPrinting(true);
        try {
            await exportPiketSchedulePdf({
                settings,
                weekDates,
                piketList,
                santriList,
                fileName: `Jadwal_Piket_${weekDates[0]}_sd_${weekDates[6]}`,
                orientation,
                customTempat: activeTempat,
                piketConfig,
            });
            showToast('PDF Data Jadwal Piket berhasil diunduh.', 'success');
        } catch (error) {
            console.error('Failed to export piket PDF:', error);
            showToast('Gagal memproses PDF Jadwal Piket.', 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    const getSantriName = (id?: number) => {
        if (!id) return null;
        const s = santriList.find(s => s.id === id);
        return s ? s.namaLengkap : 'Unknown';
    };

    const periodMasehiTitle = `${formatDate(weekDates[0])} s/d ${formatDate(weekDates[6])}`;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Top Toolbar: Jadwal Piket */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                {/* Row 1: Mode switcher and Format & Cetak Settings */}
                <div className="flex items-center justify-between gap-2.5 flex-wrap">
                    <div className="inline-flex bg-gray-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setPiketMode('weekly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                piketMode === 'weekly'
                                    ? 'bg-white text-teal-700 shadow-xs'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="bi bi-calendar-week"></i>
                            <span>Mingguan</span>
                            <span className="hidden sm:inline">&amp; Cetak</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPiketMode('daily')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                piketMode === 'daily'
                                    ? 'bg-white text-teal-700 shadow-xs'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="bi bi-calendar-day"></i>
                            <span>Harian</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsPiketSettingsOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-teal-50/80 border border-gray-200 hover:border-teal-300 rounded-xl text-xs font-bold text-gray-700 hover:text-teal-800 flex items-center gap-1.5 shadow-2xs transition-all shrink-0"
                        title="Pengaturan Khusus: Tempat Surat, Pejabat Penanda Tangan, dan Butir Ketentuan Sholat"
                    >
                        <i className="bi bi-sliders2 text-teal-600"></i>
                        <span>Format Cetak</span>
                        <span className="hidden md:inline-block px-1.5 py-0.2 bg-teal-50 text-teal-700 text-[10px] rounded border border-teal-200 font-medium">
                            {piketConfig.tempat?.trim() || defaultKota}
                        </span>
                    </button>
                </div>

                {/* Row 2: Controls & Actions based on mode */}
                {piketMode === 'weekly' ? (
                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2.5 pt-2 border-t border-gray-100">
                        {/* Week Navigation */}
                        <div className="flex items-center justify-between sm:justify-start gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                            <button
                                type="button"
                                onClick={() => setCurrentWeekRefDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
                                className="p-1.5 sm:px-2.5 hover:bg-white rounded-lg text-gray-600 transition-colors flex items-center gap-1 text-xs font-medium"
                                title="Minggu Sebelumnya"
                            >
                                <i className="bi bi-chevron-left text-xs"></i>
                                <span className="hidden sm:inline">Sebelumnya</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentWeekRefDate(new Date())}
                                className="px-3 py-1.5 text-xs font-bold bg-white text-teal-700 shadow-2xs rounded-lg transition-colors whitespace-nowrap"
                                title="Kembali ke minggu saat ini"
                            >
                                Minggu Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentWeekRefDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
                                className="p-1.5 sm:px-2.5 hover:bg-white rounded-lg text-gray-600 transition-colors flex items-center gap-1 text-xs font-medium"
                                title="Minggu Berikutnya"
                            >
                                <span className="hidden sm:inline">Berikutnya</span>
                                <i className="bi bi-chevron-right text-xs"></i>
                            </button>
                        </div>

                        {/* Action Buttons: 2x2 grid on mobile, 4-column row on tablet, inline on desktop */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePrintWeekly}
                                disabled={isPrinting}
                                className="w-full justify-center lg:w-auto bg-gray-800 hover:bg-gray-900 active:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60"
                                title="Cetak langsung ke printer atau dialog print browser"
                            >
                                <i className="bi bi-printer"></i>
                                <span>{isPrinting ? 'Memproses...' : 'Cetak A4'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDownloadPdfWeekly('landscape')}
                                disabled={isPrinting}
                                className="w-full justify-center lg:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60"
                                title="Download PDF Data Jadwal Piket Resmi (Vektor Tajam & Rapi)"
                            >
                                <i className="bi bi-file-earmark-pdf-fill"></i>
                                <span>{isPrinting ? 'Memproses...' : 'Unduh PDF'}</span>
                            </button>
                            {canWrite && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleAutoGenerateWeekly}
                                        className="w-full justify-center lg:w-auto bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 active:bg-teal-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                                        title="Otomatis acak santri yang belum piket ke seluruh jadwal minggu ini"
                                    >
                                        <i className="bi bi-magic text-teal-600"></i>
                                        <span>Auto Isi</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClearWeekly}
                                        className="w-full justify-center lg:w-auto bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:bg-red-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                                        title="Kosongkan jadwal petugas sholat minggu ini"
                                    >
                                        <i className="bi bi-trash"></i>
                                        <span>Kosongkan</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Daily Mode Controls */
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-2 border-t border-gray-100">
                        {/* Quick Day Controls & Date Picker */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const d = new Date(selectedDate + 'T00:00:00');
                                        d.setDate(d.getDate() - 1);
                                        setSelectedDate(formatLocalDate(d));
                                    }}
                                    className="px-2.5 py-1.5 text-xs bg-transparent hover:bg-white rounded-lg text-gray-700 font-semibold text-center transition-colors"
                                >
                                    Kemarin
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(formatLocalDate(new Date()))}
                                    className="px-2.5 py-1.5 text-xs bg-white text-teal-800 rounded-lg font-bold shadow-2xs text-center transition-colors"
                                >
                                    Hari Ini
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const d = new Date(selectedDate + 'T00:00:00');
                                        d.setDate(d.getDate() + 1);
                                        setSelectedDate(formatLocalDate(d));
                                    }}
                                    className="px-2.5 py-1.5 text-xs bg-transparent hover:bg-white rounded-lg text-gray-700 font-semibold text-center transition-colors"
                                >
                                    Besok
                                </button>
                            </div>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-teal-500 outline-none shadow-2xs"
                            />
                        </div>

                        {canWrite && (
                            <button
                                type="button"
                                onClick={handleAutoGenerateDaily}
                                className="w-full sm:w-auto justify-center bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 active:bg-teal-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                            >
                                <i className="bi bi-magic text-teal-600"></i>
                                <span>Auto Isi Hari Ini</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            {piketMode === 'weekly' ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b bg-gray-50/70 flex flex-wrap justify-between items-center gap-2">
                        <div>
                            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
                                <i className="bi bi-calendar4-week text-teal-600"></i>
                                <span>Jadwal Piket Mingguan</span>
                            </h2>
                            <p className="text-xs text-teal-700 font-bold mt-0.5">
                                Periode: {periodMasehiTitle}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex sm:hidden items-center gap-1 text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                                <i className="bi bi-arrows-expand"></i> Geser tabel horizontal
                            </span>
                            <div className="text-[11px] text-gray-500 font-medium hidden sm:block">
                                Klik nama petugas pada kolom sholat untuk memilih santri.
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 uppercase font-black border-b text-[11px]">
                                    <th className="p-3 w-36 border-r border-gray-200">Hari & Tanggal</th>
                                    {sholatList.map(sholat => (
                                        <th key={sholat} className="p-2 border-r border-gray-200 last:border-r-0 text-center">
                                            <div className="font-bold text-teal-900">{sholat}</div>
                                            <div className="flex justify-center items-center gap-2 text-[10px] text-gray-500 font-normal mt-0.5 pt-0.5 border-t border-gray-200">
                                                <span className="text-teal-700 font-semibold">[M] Muadzin</span>
                                                <span>•</span>
                                                <span className="text-amber-800 font-semibold">[I] Imam</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {weekDates.map(dateStr => {
                                    const d = new Date(dateStr + 'T00:00:00');
                                    const dayName = daysName[d.getDay()];
                                    const isToday = dateStr === formatLocalDate(new Date());
                                    const isFriday = d.getDay() === 5;
                                    const isSunday = d.getDay() === 0;

                                    return (
                                        <tr key={dateStr} className={`hover:bg-gray-50/70 transition-colors ${isToday ? 'bg-teal-50/40' : ''}`}>
                                            <td className={`p-3 border-r border-gray-200 font-semibold align-middle ${isFriday ? 'border-l-4 border-l-teal-600' : ''}`}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`font-bold ${isSunday ? 'text-red-600' : isFriday ? 'text-teal-800' : 'text-gray-900'}`}>
                                                        {dayName}
                                                    </span>
                                                    {isToday && (
                                                        <span className="px-1.5 py-0.2 bg-teal-600 text-white rounded text-[9px] font-bold">
                                                            Hari Ini
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                                                    {formatDate(dateStr)}
                                                </div>
                                            </td>

                                            {sholatList.map(sholat => {
                                                const item = piketList.find(p => p.tanggal === dateStr && p.sholat === sholat);
                                                const muadzinName = getSantriName(item?.muadzinSantriId);
                                                const imamName = getSantriName(item?.imamSantriId);

                                                return (
                                                    <td key={sholat} className="p-1.5 border-r border-gray-200 last:border-r-0 align-middle">
                                                        <div className="flex flex-col gap-1 text-[11px] w-full min-w-0">
                                                            {/* Muadzin Slot */}
                                                            <button
                                                                type="button"
                                                                disabled={!canWrite}
                                                                onClick={() => handleOpenSelector(dateStr, sholat, 'muadzinSantriId')}
                                                                className={`w-full px-2 py-1 rounded-lg text-left transition-all border flex items-center gap-1.5 ${
                                                                    muadzinName
                                                                        ? 'bg-teal-50/90 hover:bg-teal-100 border-teal-200 text-teal-900 font-medium'
                                                                        : 'bg-gray-50 hover:bg-gray-100 border-dashed border-gray-300 text-gray-400'
                                                                }`}
                                                                title={`Muadzin ${sholat}: ${muadzinName || 'Belum diatur'}`}
                                                            >
                                                                <span className="px-1 py-0.2 bg-teal-600 text-white rounded text-[9px] font-bold shrink-0">M</span>
                                                                <span className="truncate flex-1 font-medium">{muadzinName || '+ Muadzin'}</span>
                                                            </button>

                                                            {/* Imam Slot */}
                                                            <button
                                                                type="button"
                                                                disabled={!canWrite}
                                                                onClick={() => handleOpenSelector(dateStr, sholat, 'imamSantriId')}
                                                                className={`w-full px-2 py-1 rounded-lg text-left transition-all border flex items-center gap-1.5 ${
                                                                    imamName
                                                                        ? 'bg-amber-50/90 hover:bg-amber-100 border-amber-200 text-amber-900 font-medium'
                                                                        : 'bg-gray-50 hover:bg-gray-100 border-dashed border-gray-300 text-gray-400'
                                                                }`}
                                                                title={`Imam ${sholat}: ${imamName || 'Belum diatur'}`}
                                                            >
                                                                <span className="px-1 py-0.2 bg-amber-600 text-white rounded text-[9px] font-bold shrink-0">I</span>
                                                                <span className="truncate flex-1 font-medium">{imamName || '+ Imam'}</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <i className="bi bi-clock-history text-teal-600"></i>
                                <span>Jadwal Harian: {formatDate(selectedDate)}</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">Petugas Adzan dan Imam santri harian.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase border-b text-xs">
                                <tr>
                                    <th className="p-3 w-36">Waktu Sholat</th>
                                    <th className="p-3 w-1/2">Muadzin</th>
                                    <th className="p-3 w-1/2">Imam (Santri/Badal)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sholatList.map(sholat => {
                                    const item = piketList.find(p => p.tanggal === selectedDate && p.sholat === sholat);
                                    const muadzinName = getSantriName(item?.muadzinSantriId);
                                    const imamName = getSantriName(item?.imamSantriId);

                                    return (
                                        <tr key={sholat} className="hover:bg-gray-50">
                                            <td className="p-3 font-bold text-teal-800 bg-gray-50/50 align-middle border-r border-gray-100">
                                                {sholat}
                                            </td>
                                            <td className="p-2">
                                                <button 
                                                    onClick={() => handleOpenSelector(selectedDate, sholat, 'muadzinSantriId')}
                                                    disabled={!canWrite}
                                                    className={`w-full text-left px-3 py-2 rounded-xl border transition-colors flex justify-between items-center text-xs ${muadzinName ? 'bg-white border-gray-300 text-gray-800 font-medium' : 'bg-gray-50 border-dashed border-gray-300 text-gray-400'}`}
                                                >
                                                    <span className="truncate">{muadzinName || 'Pilih Petugas Muadzin...'}</span>
                                                    {canWrite && <i className="bi bi-pencil-square text-xs opacity-50"></i>}
                                                </button>
                                            </td>
                                            <td className="p-2">
                                                <button 
                                                    onClick={() => handleOpenSelector(selectedDate, sholat, 'imamSantriId')}
                                                    disabled={!canWrite}
                                                    className={`w-full text-left px-3 py-2 rounded-xl border transition-colors flex justify-between items-center text-xs ${imamName ? 'bg-white border-gray-300 text-gray-800 font-medium' : 'bg-gray-50 border-dashed border-gray-300 text-gray-400'}`}
                                                >
                                                    <span className="truncate">{imamName || 'Pilih Petugas Imam (Opsional)...'}</span>
                                                    {canWrite && <i className="bi bi-pencil-square text-xs opacity-50"></i>}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Information Notice */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <i className="bi bi-info-circle-fill text-base text-blue-600 mt-0.5"></i>
                <div className="leading-relaxed">
                    <strong>Panduan Petugas Sholat:</strong> Muadzin diharapkan berada di masjid 10 menit sebelum waktu sholat tiba. Jadwal Imam santri ditujukan untuk latihan kepemimpinan ibadah & imam badal apabila Ustadz/Kyai udzur.
                </div>
            </div>

            {/* Modal Selector */}
            <StudentSelectorModal 
                isOpen={selectorOpen}
                onClose={() => setSelectorOpen(false)}
                onSelect={handleSelectSantri}
                title={editingSlot ? `Pilih ${editingSlot.field === 'muadzinSantriId' ? 'Muadzin' : 'Imam'} - ${editingSlot.sholat} (${formatDate(editingSlot.tanggal)})` : 'Pilih Petugas'}
            />

            {/* Modal Pengaturan Cetak Piket (Tempat, Penanda Tangan, Ketentuan) */}
            <PiketSettingsModal
                isOpen={isPiketSettingsOpen}
                onClose={() => setIsPiketSettingsOpen(false)}
                config={piketConfig}
                onSave={handleSavePiketConfig}
                defaultKota={defaultKota}
                defaultMudir={settings.namaMudir}
            />

            {/* Hidden Printable Area for Piket Template */}
            <div className="fixed -left-[10000px] top-0 -z-[100] pointer-events-none">
                <div id="piket-weekly-print-area">
                    <PiketPrintTemplate
                        settings={settings}
                        weekDates={weekDates}
                        piketList={piketList}
                        santriList={santriList}
                        customTempat={activeTempat}
                        piketConfig={piketConfig}
                    />
                </div>
            </div>
        </div>
    );
};

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
    const [isExporting, setIsExporting] = useState(false);
    const [primarySystem, setPrimarySystem] = useState<'Masehi' | 'Hijriah'>('Masehi');
    const [showFasting, setShowFasting] = useState(true);
    const [showFastingLegend, setShowFastingLegend] = useState(false);
    const [calendarSubView, setCalendarSubView] = useState<'grid' | 'agenda'>('grid');
    const [activeView, setActiveView] = useState<'kalender' | 'piket'>('kalender');

    // Print State
    const [printConfig, setPrintConfig] = useState<{
        theme: 'classic' | 'modern' | 'bold' | 'dark' | 'ceria', 
        layout: '1_sheet' | '3_sheets' | '4_sheets',
        primarySystem: 'Masehi' | 'Hijriah',
        showKop: boolean,
        showAgendaAppendix?: boolean,
        customTempat?: string,
        customImage?: string,
        imagePosition?: 'banner' | 'watermark' | 'none',
        startMonth?: number,
        startYear?: number,
        endMonth?: number,
        endYear?: number,
        periodLabelMasehi?: string,
        periodLabelHijriah?: string,
        useAcademicPeriodLabel?: boolean,
        academicHijriStartMonthIndex?: number,
        academicHijriStartYear?: number
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

    // Filters for Kalender
    const [filterJenjangId, setFilterJenjangId] = useState<number>(0);
    const [filterKelasId, setFilterKelasId] = useState<number>(0);
    const [filterRombelId, setFilterRombelId] = useState<number>(0);
    const [filterCategory, setFilterCategory] = useState<string>('Semua');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isAcademicFilterExpanded, setIsAcademicFilterExpanded] = useState<boolean>(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {
            'Semua': events.length,
            'Kegiatan': 0,
            'Ujian': 0,
            'Libur': 0,
            'Rapat': 0,
            'Lainnya': 0
        };
        events.forEach(e => {
            if (counts[e.category] !== undefined) {
                counts[e.category]++;
            } else {
                counts['Lainnya']++;
            }
        });
        return counts;
    }, [events]);

    const academicFiltersCount = (filterJenjangId > 0 ? 1 : 0) + (filterKelasId > 0 ? 1 : 0) + (filterRombelId > 0 ? 1 : 0);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchQuery.trim().length > 0) count++;
        if (filterCategory !== 'Semua') count++;
        if (filterJenjangId > 0) count++;
        if (filterKelasId > 0) count++;
        if (filterRombelId > 0) count++;
        return count;
    }, [searchQuery, filterCategory, filterJenjangId, filterKelasId, filterRombelId]);

    const availableKelas = useMemo(() => {
        if (!filterJenjangId) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === filterJenjangId);
    }, [filterJenjangId, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (!filterKelasId) {
            if (!filterJenjangId) return settings.rombel;
            const kIds = availableKelas.map(k => k.id);
            return settings.rombel.filter(r => kIds.includes(r.kelasId));
        }
        return settings.rombel.filter(r => r.kelasId === filterKelasId);
    }, [filterKelasId, filterJenjangId, availableKelas, settings.rombel]);

    const isFilterActive = filterJenjangId > 0 || filterKelasId > 0 || filterRombelId > 0 || filterCategory !== 'Semua' || searchQuery.trim().length > 0;

    const resetFilters = () => {
        setFilterJenjangId(0);
        setFilterKelasId(0);
        setFilterRombelId(0);
        setFilterCategory('Semua');
        setSearchQuery('');
    };

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            if (filterJenjangId) {
                if (e.jenjangId && e.jenjangId !== filterJenjangId) return false;
            }
            if (filterKelasId) {
                if (e.kelasId && e.kelasId !== filterKelasId) return false;
            }
            if (filterRombelId) {
                if (e.rombelId && e.rombelId !== filterRombelId) return false;
            }
            if (filterCategory !== 'Semua') {
                if (e.category !== filterCategory) return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = e.title.toLowerCase().includes(q);
                const matchDesc = e.description?.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc) return false;
            }
            return true;
        });
    }, [events, filterJenjangId, filterKelasId, filterRombelId, filterCategory, searchQuery]);

    // Grid Generation Logic
    const calendarDays = useMemo(() => {
        const days: {
            dateObj: Date;
            dateStr: string;
            masehi: number;
            hijri: string;
            hijriDay: string;
            hijriDayArabic: string;
            isFasting?: string;
            isRamadan?: boolean;
        }[] = [];
        
        const processDay = (d: Date) => {
            const dateStr = formatLocalDate(d);
            const h = getHijriDate(d, hijriAdjustment);
            const dayOfWeek = d.getDay();
            const hDay = parseInt(h.day);
            const hMonth = h.month;

            let fastingType = '';
            let isRamadan = false;
            const normMonth = (hMonth || '').toLowerCase();

            if (normMonth.includes('ramad')) {
                isRamadan = true;
                fastingType = 'Ramadhan';
            } else if ((normMonth.includes('muharram') || normMonth.includes('muharam')) && (hDay === 9 || hDay === 10)) {
                fastingType = hDay === 9 ? "Tasu'a (9 Muharram)" : "Asyura (10 Muharram)";
            } else if ((normMonth.includes('hijjah') || normMonth.includes('hijja')) && hDay === 9) {
                fastingType = 'Arafah (9 Dzulhijjah)';
            } else if ((normMonth.includes('syawal') || normMonth.includes('shawwal')) && hDay >= 2 && hDay <= 7) {
                fastingType = 'Sunnah Syawal';
            } else if ([13, 14, 15].includes(hDay)) {
                // Ayyamul Bidh (13, 14, 15) except Tasyrik days (11,12,13 Dzulhijjah is forbidden)
                if (!normMonth.includes('hijjah') || hDay !== 13) {
                    fastingType = 'Ayyamul Bidh';
                }
            } else if (dayOfWeek === 1 || dayOfWeek === 4) {
                // Check forbidden days (1 Syawal, 10 Dzulhijjah, Tasyrik 11,12,13)
                const isSyawal1 = (normMonth.includes('syawal') || normMonth.includes('shawwal')) && hDay === 1;
                const isAdhaOrTasyrik = (normMonth.includes('hijjah') || normMonth.includes('hijja')) && [10, 11, 12, 13].includes(hDay);
                
                if (!isSyawal1 && !isAdhaOrTasyrik) {
                    fastingType = 'Senin-Kamis';
                }
            }

            return {
                dateObj: d,
                dateStr,
                masehi: d.getDate(),
                hijri: `${h.month} ${h.year}`,
                hijriDay: h.day,
                hijriDayArabic: toArabicNumerals(h.day),
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
        const startStr = calendarDays[0].dateStr;
        const endStr = calendarDays[calendarDays.length - 1].dateStr;
        
        return filteredEvents.filter(e => {
            const eStart = (e.startDate || '').split('T')[0];
            const eEnd = (e.endDate || e.startDate || '').split('T')[0];
            return eStart <= endStr && eEnd >= startStr;
        });
    }, [filteredEvents, calendarDays]);

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
        if (isExporting) return;
        setIsExporting(true);
        setPrintConfig({ theme, layout, primarySystem: system, showKop, customImage, imagePosition });
        setIsPrintModalOpen(false);
        setTimeout(async () => {
            try {
                await printExportFacade.printDialog({
                    elementId: 'calendar-print-area',
                    fileName: `Kalender_Akademik_${anchorDate.getFullYear()}`,
                    paperSize: 'A4',
                    target: 'report',
                });
            } finally {
                setTimeout(() => setIsExporting(false), 300);
            }
        }, 1000);
    };

    const handleExportPdfRequest = (theme: any, layout: any, system: 'Masehi' | 'Hijriah', showKop: boolean, customImage?: string, imagePosition?: 'banner' | 'watermark' | 'none') => {
        if (isExporting) return;
        setIsExporting(true);
        setPrintConfig({ theme, layout, primarySystem: system, showKop, customImage, imagePosition });
        setIsPrintModalOpen(false);
        setTimeout(async () => {
            try {
                await printExportFacade.downloadPdfImage({
                    elementId: 'calendar-print-area',
                    fileName: `Kalender_Akademik_${anchorDate.getFullYear()}`,
                    paperSize: 'A4',
                    target: 'report',
                });
            } finally {
                setTimeout(() => setIsExporting(false), 300);
            }
        }, 1000);
    };

    const handleExportPdfTableRequest = async (options: any, mode: 'print' | 'pdf' | 'pdf_table' | 'html' = 'print') => {
        if (isExporting) return;
        setIsExporting(true);
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const exportBaseName = `${stamp}-kalender-pendidikan-${(options.primarySystem || 'masehi').toLowerCase()}-${options.layout || '1_sheet'}`;

        setPrintConfig({ 
            theme: options.theme, 
            layout: options.layout, 
            primarySystem: options.primarySystem, 
            showKop: options.showKop,
            showAgendaAppendix: options.showAgendaAppendix ?? true,
            customTempat: options.customTempat,
            startMonth: options.startMonth,
            startYear: options.startYear,
            endMonth: options.endMonth,
            endYear: options.endYear,
            customImage: options.customImage,
            imagePosition: options.imagePosition,
            periodLabelMasehi: options.periodLabelMasehi,
            periodLabelHijriah: options.periodLabelHijriah,
            useAcademicPeriodLabel: options.useAcademicPeriodLabel,
            academicHijriStartMonthIndex: options.academicHijriStartMonthIndex,
            academicHijriStartYear: options.academicHijriStartYear
        });
        setIsPrintModalOpen(false);

        if (mode === 'pdf_table') {
            try {
                const [{ jsPDF }, autoTableModule] = await Promise.all([loadJsPdf(), loadJsPdfAutoTable()]);
                const autoTable = autoTableModule.default;
                const doc = new jsPDF('p', 'mm', 'a4');
                const arabicNumeralCache = new Map<string, { dataUrl: string; widthMm: number; heightMm: number }>();
                const getArabicNumeralImage = (
                    arabicText: string,
                    colorRgb: [number, number, number] = [13, 118, 110],
                    isBold: boolean = false,
                    heightMm: number = 2.0
                ): { dataUrl: string; widthMm: number; heightMm: number } | null => {
                    if (typeof document === 'undefined') return null;
                    const colorStr = `rgb(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]})`;
                    const cacheKey = `${arabicText}_${colorStr}_${isBold}_${heightMm.toFixed(2)}`;
                    if (arabicNumeralCache.has(cacheKey)) {
                        return arabicNumeralCache.get(cacheKey)!;
                    }

                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return null;

                        const scale = 4;
                        const baseFontSize = isBold ? 36 : 30;
                        const fontStack = `${isBold ? 'bold' : 'normal'} ${baseFontSize}px "Amiri", "Traditional Arabic", "Scheherazade New", "Segoe UI", Arial, sans-serif`;

                        ctx.font = fontStack;
                        const metrics = ctx.measureText(arabicText);
                        const textWidthPx = Math.ceil(metrics.width) + 8;
                        const textHeightPx = Math.ceil(baseFontSize * 1.3);

                        canvas.width = textWidthPx * scale;
                        canvas.height = textHeightPx * scale;

                        ctx.scale(scale, scale);
                        ctx.font = fontStack;
                        ctx.fillStyle = colorStr;
                        ctx.textBaseline = 'middle';
                        ctx.textAlign = 'center';
                        ctx.fillText(arabicText, textWidthPx / 2, textHeightPx / 2);

                        const aspect = textWidthPx / textHeightPx;
                        const widthMm = heightMm * aspect;
                        const item = {
                            dataUrl: canvas.toDataURL('image/png'),
                            widthMm,
                            heightMm
                        };
                        arabicNumeralCache.set(cacheKey, item);
                        return item;
                    } catch {
                        return null;
                    }
                };
                const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const hijriMonthNames = ['Muharram', 'Safar', "Rabi'ul Awwal", "Rabi'ul Akhir", 'Jumadil Ula', 'Jumadil Akhir', 'Rajab', "Sya'ban", 'Ramadhan', 'Syawwal', "Dzulqa'dah", 'Dzulhijjah'];
                const cleanRange = (value: string) => value.replace(/PERIODE\s+(MASEHI|HIJRIAH)\s*/gi, '').replace(/\s+/g, ' ').trim();

                const periodMasehi = options.useAcademicPeriodLabel && options.periodLabelMasehi
                    ? cleanRange(options.periodLabelMasehi)
                    : `${new Date(options.startYear, options.startMonth, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} - ${new Date(options.endYear, options.endMonth, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
                const periodHijriah = options.useAcademicPeriodLabel && options.periodLabelHijriah
                    ? cleanRange(options.periodLabelHijriah)
                    : (() => {
                        const startH = getHijriDate(new Date(options.startYear, options.startMonth, 1), settings.hijriAdjustment || 0);
                        const endH = getHijriDate(new Date(options.endYear, options.endMonth + 1, 0), settings.hijriAdjustment || 0);
                        return `${startH.year}-${endH.year}H`;
                    })();
                const periodText = `PERIODE ${periodHijriah.replace(/\s*H$/i, '')}H / ${periodMasehi.replace(/\s*M$/i, '')}M`;

                const drawHeader = () => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(16);
                    doc.text('KALENDER PENDIDIKAN', 105, 14, { align: 'center' });
                    doc.setFontSize(13);
                    doc.text(String(settings.namaPonpes || '').toUpperCase(), 105, 20, { align: 'center' });
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.text(periodText, 105, 26, { align: 'center' });
                    doc.setLineWidth(0.3);
                    doc.line(14, 29, 196, 29);
                };
                const drawFooter = () => {
                    const pageHeight = doc.internal.pageSize.getHeight();
                    doc.setDrawColor(170, 170, 170);
                    doc.setLineWidth(0.15);
                    doc.line(14, pageHeight - 10, 196, pageHeight - 10);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, pageHeight - 6);
                    doc.text('dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id', 196, pageHeight - 6, { align: 'right' });
                };
                const formatEventRange = (startDate: string, endDate: string) => {
                    const s = new Date(startDate);
                    const e = new Date(endDate);
                    s.setHours(0, 0, 0, 0);
                    e.setHours(0, 0, 0, 0);
                    const sameDay = s.getTime() === e.getTime();
                    if (sameDay) return `${s.getDate()} ${s.toLocaleDateString('id-ID', { month: 'short' })}`;
                    const sameMonthYear = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
                    if (sameMonthYear) return `${s.getDate()}-${e.getDate()} ${s.toLocaleDateString('id-ID', { month: 'short' })}`;
                    const sameYear = s.getFullYear() === e.getFullYear();
                    if (sameYear) {
                        return `${s.getDate()} ${s.toLocaleDateString('id-ID', { month: 'short' })} - ${e.getDate()} ${e.toLocaleDateString('id-ID', { month: 'short' })}`;
                    }
                    return `${s.toLocaleDateString('id-ID')} - ${e.toLocaleDateString('id-ID')}`;
                };

                const monthItems: Array<{ month: number; year: number; startDate: Date; endDate: Date; title: string; subtitle: string; mode: 'Masehi' | 'Hijriah' }> = [];
                if (options.primarySystem === 'Masehi') {
                    let currMonth = options.startMonth;
                    let currYear = options.startYear;
                    while (currYear < options.endYear || (currYear === options.endYear && currMonth <= options.endMonth)) {
                        const hStart = getHijriDate(new Date(currYear, currMonth, 1), settings.hijriAdjustment || 0);
                        const hEnd = getHijriDate(new Date(currYear, currMonth + 1, 0), settings.hijriAdjustment || 0);
                        const hijriSubtitle = hStart.month === hEnd.month
                            ? `${hStart.month} ${hStart.year}`
                            : `${hStart.month} - ${hEnd.month} ${hStart.year}`;
                        monthItems.push({
                            month: currMonth,
                            year: currYear,
                            startDate: new Date(currYear, currMonth, 1),
                            endDate: new Date(currYear, currMonth + 1, 0),
                            title: `${monthNames[currMonth]} ${currYear}`.toUpperCase(),
                            subtitle: hijriSubtitle.toUpperCase(),
                            mode: 'Masehi',
                        });
                        currMonth += 1;
                        if (currMonth > 11) {
                            currMonth = 0;
                            currYear += 1;
                        }
                    }
                } else {
                    const findHijriMonthStartDate = (targetYear: number, targetMonthIndex: number): Date => {
                        const estimatedMasehiYear = Math.floor(targetYear * 0.97023 + 621.57);
                        const anchor = new Date(estimatedMasehiYear, 5, 15);
                        const maxSearchDays = 1200;
                        for (let offset = 0; offset <= maxSearchDays; offset++) {
                            const forward = new Date(anchor);
                            forward.setDate(anchor.getDate() + offset);
                            const hForward = getHijriDate(forward, settings.hijriAdjustment || 0);
                            if (parseInt(hForward.year, 10) === targetYear && hForward.monthIndex === targetMonthIndex && hForward.day === '1') return forward;
                            if (offset > 0) {
                                const backward = new Date(anchor);
                                backward.setDate(anchor.getDate() - offset);
                                const hBackward = getHijriDate(backward, settings.hijriAdjustment || 0);
                                if (parseInt(hBackward.year, 10) === targetYear && hBackward.monthIndex === targetMonthIndex && hBackward.day === '1') return backward;
                            }
                        }
                        return new Date(estimatedMasehiYear, 0, 1);
                    };

                    let currMonth = options.startMonth;
                    let currYear = options.startYear;
                    let cursorDate = findHijriMonthStartDate(currYear, currMonth);
                    while (currYear < options.endYear || (currYear === options.endYear && currMonth <= options.endMonth)) {
                        const hStart = getHijriDate(cursorDate, settings.hijriAdjustment || 0);
                        const monthName = hStart.month;
                        const startDate = new Date(cursorDate);
                        const lastDate = new Date(cursorDate);
                        while (true) {
                            const next = new Date(lastDate);
                            next.setDate(next.getDate() + 1);
                            const hNext = getHijriDate(next, settings.hijriAdjustment || 0);
                            if (hNext.month !== monthName) break;
                            lastDate.setDate(lastDate.getDate() + 1);
                            if (lastDate.getTime() - startDate.getTime() > 35 * 24 * 3600 * 1000) break;
                        }

                        const masehiSubtitleStart = startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                        const masehiSubtitleEnd = lastDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                        const masehiSubtitle = startDate.getMonth() === lastDate.getMonth() && startDate.getFullYear() === lastDate.getFullYear()
                            ? masehiSubtitleStart
                            : `${startDate.toLocaleDateString('id-ID', { month: 'long' })} - ${masehiSubtitleEnd}`;
                        monthItems.push({
                            month: currMonth,
                            year: currYear,
                            startDate: new Date(startDate),
                            endDate: new Date(lastDate),
                            title: `${monthName} ${hStart.year}`.toUpperCase(),
                            subtitle: masehiSubtitle.toUpperCase(),
                            mode: 'Hijriah',
                        });

                        const nextStart = new Date(lastDate);
                        nextStart.setDate(nextStart.getDate() + 1);
                        cursorDate = nextStart;
                        currMonth += 1;
                        if (currMonth > 11) {
                            currMonth = 0;
                            currYear += 1;
                        }
                    }
                }

                const layoutMode = options.layout || '1_sheet';
                const cols = layoutMode === '1_sheet' ? 3 : layoutMode === '3_sheets' ? 2 : 1;
                const rowsPerPage = layoutMode === '1_sheet' ? 4 : layoutMode === '3_sheets' ? 2 : 3;
                const monthsPerPage = cols * rowsPerPage;
                const pageGapX = 3;
                const pageGapY = 3;
                const pageTop = 32;
                const pageBottom = 11;
                const usableWidth = 210 - 14 - 14;
                const usableHeight = 297 - pageTop - pageBottom;
                const boxWidth = (usableWidth - (cols - 1) * pageGapX) / cols;
                const boxHeight = (usableHeight - (rowsPerPage - 1) * pageGapY) / rowsPerPage;
                const colorClassMap: Record<string, [number, number, number]> = {
                    'bg-red-500': [239, 68, 68],
                    'bg-green-500': [34, 197, 94],
                    'bg-blue-500': [59, 130, 246],
                    'bg-yellow-500': [234, 179, 8],
                    'bg-purple-500': [168, 85, 247],
                    'bg-pink-500': [236, 72, 153],
                    'bg-gray-500': [107, 114, 128],
                    'bg-teal-500': [20, 184, 166],
                };
                const hexToRgb = (hex: string): [number, number, number] | null => {
                    const raw = hex.replace('#', '').trim();
                    if (raw.length !== 6) return null;
                    const r = Number.parseInt(raw.slice(0, 2), 16);
                    const g = Number.parseInt(raw.slice(2, 4), 16);
                    const b = Number.parseInt(raw.slice(4, 6), 16);
                    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
                    return [r, g, b];
                };
                const resolveEventColor = (eventColor?: string): [number, number, number] => {
                    if (!eventColor) return [16, 120, 110];
                    if (eventColor.startsWith('#')) return hexToRgb(eventColor) || [16, 120, 110];
                    return colorClassMap[eventColor] || [16, 120, 110];
                };

                for (let startIdx = 0; startIdx < monthItems.length; startIdx += monthsPerPage) {
                    if (startIdx > 0) doc.addPage('a4', 'p');
                    drawHeader();
                    const pageMonths = monthItems.slice(startIdx, startIdx + monthsPerPage);

                    pageMonths.forEach((item, idxOnPage) => {
                        const col = idxOnPage % cols;
                        const row = Math.floor(idxOnPage / cols);
                        const x = 14 + col * (boxWidth + pageGapX);
                        const y = pageTop + row * (boxHeight + pageGapY);

                        doc.setDrawColor(201, 162, 39);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(x, y, boxWidth, boxHeight, 1.2, 1.2);

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(layoutMode === '1_sheet' ? 9 : layoutMode === '3_sheets' ? 10.6 : 11.4);
                        doc.setTextColor(36, 85, 72);
                        doc.text(item.title, x + boxWidth / 2, y + (layoutMode === '4_sheets' ? 5.2 : 4.5), { align: 'center' });
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(layoutMode === '1_sheet' ? 5.2 : layoutMode === '3_sheets' ? 6.6 : 7.6);
                        doc.setTextColor(150, 125, 55);
                        doc.text(item.subtitle, x + boxWidth / 2, y + (layoutMode === '4_sheets' ? 8.8 : 7.6), { align: 'center' });

                        const dayNames = ['Ah', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];
                        const days: Array<Date | null> = [];
                        const firstDow = item.startDate.getDay();
                        for (let i = 0; i < firstDow; i++) days.push(null);
                        let d = new Date(item.startDate);
                        while (d <= item.endDate) {
                            days.push(new Date(d));
                            d.setDate(d.getDate() + 1);
                        }
                        while (days.length % 7 !== 0) days.push(null);

                        const tableBody: string[][] = [];
                        for (let i = 0; i < days.length; i += 7) {
                            tableBody.push(
                                days.slice(i, i + 7).map((dateCell) => {
                                    if (!dateCell) return '';
                                    const h = getHijriDate(dateCell, settings.hijriAdjustment || 0);
                                    const isMasehiMode = item.mode === 'Masehi';
                                    const masehiNum = String(dateCell.getDate());
                                    const hijriArabic = toArabicNumerals(h.day);
                                    const hijriLatin = String(h.day);

                                    const main = isMasehiMode ? masehiNum : hijriArabic;
                                    const sub = isMasehiMode ? hijriArabic : masehiNum;
                                    const mainIsArabic = !isMasehiMode ? '1' : '0';
                                    const subIsArabic = isMasehiMode ? '1' : '0';

                                    const dayStart = new Date(dateCell);
                                    dayStart.setHours(0, 0, 0, 0);
                                    const dayEnd = new Date(dateCell);
                                    dayEnd.setHours(23, 59, 59, 999);
                                    const dayEvents = events.filter((e) => {
                                        const evStart = new Date(e.startDate);
                                        const evEnd = new Date(e.endDate);
                                        evStart.setHours(0, 0, 0, 0);
                                        evEnd.setHours(23, 59, 59, 999);
                                        return evStart <= dayEnd && evEnd >= dayStart;
                                    });
                                    const color = dayEvents.length > 0 ? resolveEventColor(dayEvents[0].color).join(',') : '';
                                    return `${main}|${sub}|${color}|${mainIsArabic}|${subIsArabic}|${hijriLatin}`;
                                })
                            );
                        }

                        const tableStartY = y + (layoutMode === '4_sheets' ? 9.8 : layoutMode === '3_sheets' ? 8.4 : 8.1);
                        const agendaHeight = layoutMode === '1_sheet' ? 13.5 : layoutMode === '3_sheets' ? 14.5 : 17.5;
                        const agendaStartY = y + boxHeight - agendaHeight;
                        const rowsCount = tableBody.length + 1; // include header
                        const tableAvailable = Math.max(30, agendaStartY - tableStartY - 1);
                        const minCellH = Math.max(
                            layoutMode === '1_sheet' ? 4.8 : layoutMode === '3_sheets' ? 5.2 : 5.6,
                            tableAvailable / rowsCount
                        );

                        autoTable(doc, {
                            startY: tableStartY,
                            margin: { left: x, right: 210 - (x + boxWidth) },
                            tableWidth: boxWidth,
                            head: [dayNames],
                            body: tableBody,
                            theme: 'grid',
                            styles: {
                                fontSize: 6.2,
                                cellPadding: 0.4,
                                valign: 'top',
                                halign: 'left',
                                textColor: [255, 255, 255],
                                lineColor: [210, 210, 210],
                                lineWidth: 0.1,
                                minCellHeight: minCellH,
                                overflow: 'hidden',
                            },
                            columnStyles: {
                                0: { cellWidth: boxWidth / 7 },
                                1: { cellWidth: boxWidth / 7 },
                                2: { cellWidth: boxWidth / 7 },
                                3: { cellWidth: boxWidth / 7 },
                                4: { cellWidth: boxWidth / 7 },
                                5: { cellWidth: boxWidth / 7 },
                                6: { cellWidth: boxWidth / 7 },
                            },
                            headStyles: {
                                fillColor: [15, 118, 110],
                                textColor: [255, 255, 255],
                                fontStyle: 'bold',
                                halign: 'center',
                                valign: 'middle',
                                fontSize: layoutMode === '1_sheet' ? 6.8 : layoutMode === '3_sheets' ? 7.6 : 8,
                                minCellHeight: layoutMode === '4_sheets' ? 7.2 : layoutMode === '3_sheets' ? 6.3 : 5.8,
                                cellPadding: { top: 0, right: 0.2, bottom: 0, left: 0.2 },
                            },
                            didParseCell: (data: any) => {
                                if (data.section === 'head') {
                                    data.cell._dayLabel = String(data.cell.raw || '');
                                    data.cell.text = [''];
                                }
                            },
                            didDrawCell: (data: any) => {
                                if (data.section === 'head') {
                                    const label = String(data.cell._dayLabel || '');
                                    if (!label) return;
                                    doc.setFont('helvetica', 'bold');
                                    doc.setFontSize(layoutMode === '1_sheet' ? 6.8 : layoutMode === '3_sheets' ? 7.6 : 8);
                                    doc.setTextColor(255, 255, 255);
                                    doc.text(label, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 0.15, {
                                        align: 'center',
                                        baseline: 'middle',
                                    } as any);
                                    return;
                                }
                                if (data.section !== 'body') return;
                                const raw = String(data.cell.raw || '');
                                if (!raw || !raw.includes('|')) return;
                                const [main, sub, colorPayload, mainIsArabicFlag, subIsArabicFlag, hijriLatin] = raw.split('|');
                                if (!main) return;

                                const isMainArabic = mainIsArabicFlag === '1';
                                const isSubArabic = subIsArabicFlag === '1';

                                let textColor: [number, number, number] = [35, 35, 35];
                                if (colorPayload) {
                                    const [r, g, b] = colorPayload.split(',').map((n) => Number(n));
                                    if (r !== undefined && g !== undefined && b !== undefined && !Number.isNaN(r)) {
                                        textColor = [r, g, b];
                                    }
                                }

                                // 1. Draw Main Number (Large at bottom left)
                                const mainFontSize = layoutMode === '1_sheet' ? 9.4 : layoutMode === '3_sheets' ? 12.2 : 12.6;
                                const mainHeightMm = layoutMode === '1_sheet' ? 3.7 : layoutMode === '3_sheets' ? 4.6 : 5.0;

                                if (isMainArabic) {
                                    const mainImg = getArabicNumeralImage(main, textColor, true, mainHeightMm);
                                    if (mainImg) {
                                        doc.addImage(mainImg.dataUrl, 'PNG', data.cell.x + 0.8, data.cell.y + data.cell.height - mainImg.heightMm - 0.6, mainImg.widthMm, mainImg.heightMm);
                                    } else {
                                        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                                        doc.setFont('helvetica', 'bold');
                                        doc.setFontSize(mainFontSize);
                                        doc.text(hijriLatin || main, data.cell.x + 0.8, data.cell.y + data.cell.height - 0.8);
                                    }
                                } else {
                                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                                    doc.setFont('helvetica', 'bold');
                                    doc.setFontSize(mainFontSize);
                                    const mainY = data.cell.y + data.cell.height - 0.8;
                                    doc.text(main, data.cell.x + 0.8, mainY);
                                }

                                // 2. Draw Secondary Number (Small at top right)
                                if (sub) {
                                    const subHeightMm = layoutMode === '1_sheet' ? 1.8 : layoutMode === '3_sheets' ? 2.2 : 2.5;
                                    const subFontSize = layoutMode === '1_sheet' ? 3.8 : layoutMode === '3_sheets' ? 4.4 : 4.8;

                                    if (isSubArabic) {
                                        const subImg = getArabicNumeralImage(sub, [13, 118, 110], true, subHeightMm);
                                        if (subImg) {
                                            doc.addImage(subImg.dataUrl, 'PNG', data.cell.x + data.cell.width - subImg.widthMm - 0.6, data.cell.y + 0.5, subImg.widthMm, subImg.heightMm);
                                        } else {
                                            doc.setTextColor(120, 120, 120);
                                            doc.setFont('helvetica', 'normal');
                                            doc.setFontSize(subFontSize);
                                            const textW = doc.getTextWidth(hijriLatin || sub);
                                            doc.text(hijriLatin || sub, data.cell.x + data.cell.width - textW - 0.7, data.cell.y + 2.1);
                                        }
                                    } else {
                                        doc.setTextColor(120, 120, 120);
                                        doc.setFont('helvetica', 'normal');
                                        doc.setFontSize(subFontSize);
                                        const textW = doc.getTextWidth(sub);
                                        doc.text(sub, data.cell.x + data.cell.width - textW - 0.7, data.cell.y + 2.1);
                                    }
                                }
                            },
                        });

                        const monthEvents = events
                            .filter((e) => {
                                const evStart = new Date(e.startDate);
                                const evEnd = new Date(e.endDate);
                                evStart.setHours(0, 0, 0, 0);
                                evEnd.setHours(23, 59, 59, 999);
                                return evStart <= item.endDate && evEnd >= item.startDate;
                            })
                            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                        doc.setDrawColor(220, 220, 220);
                        doc.setLineWidth(0.1);
                        doc.line(x, agendaStartY - 0.8, x + boxWidth, agendaStartY - 0.8);

                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(layoutMode === '1_sheet' ? 4.6 : layoutMode === '3_sheets' ? 5 : 5.6);
                        doc.setTextColor(65, 65, 65);
                        if (monthEvents.length === 0) {
                            doc.text('Belum ada agenda.', x + 0.8, agendaStartY + 1.8);
                        } else {
                            const rowHeight = layoutMode === '1_sheet' ? 1.9 : layoutMode === '3_sheets' ? 2.5 : 2.85;
                            const agendaTop = agendaStartY + 1.6;
                            const agendaBottom = y + boxHeight - 0.8;
                            const rowsAvailable = Math.max(1, Math.floor((agendaBottom - agendaTop) / rowHeight));
                            const useTwoCols = monthEvents.length > (layoutMode === '1_sheet' ? 6 : 3);
                            const colGap = 1.2;
                            const colWidth = useTwoCols ? (boxWidth - 2.2 - colGap) / 2 : (boxWidth - 2.2);
                            const maxEvents = useTwoCols ? rowsAvailable * 2 : rowsAvailable;
                            const renderEvents = monthEvents.slice(0, maxEvents);
                            const leftCount = useTwoCols ? Math.ceil(renderEvents.length / 2) : renderEvents.length;

                            renderEvents.forEach((ev, evIdx) => {
                                const dotColor = resolveEventColor(ev.color);
                                const isRightCol = useTwoCols && evIdx >= leftCount;
                                const rowIdx = useTwoCols ? (isRightCol ? evIdx - leftCount : evIdx) : evIdx;
                                const baseX = useTwoCols
                                    ? (isRightCol ? x + 1.1 + colWidth + colGap : x + 1.1)
                                    : x + 1.1;
                                const lineY = agendaTop + rowIdx * rowHeight;

                                doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
                                doc.circle(baseX, lineY - 0.55, 0.42, 'F');
                                doc.setTextColor(65, 65, 65);

                                // Truncate strictly to single line with ellipsis to guarantee no wrapping or stacking
                                const maxTextWidth = colWidth - 2.2;
                                let line = `${formatEventRange(ev.startDate, ev.endDate)}: ${ev.title}`;
                                if (doc.getTextWidth(line) > maxTextWidth) {
                                    while (line.length > 3 && doc.getTextWidth(line + '...') > maxTextWidth) {
                                        line = line.slice(0, -1);
                                    }
                                    line = line.trimEnd() + '...';
                                }
                                // Render without maxWidth so jsPDF never wraps to second line
                                doc.text(line, baseX + 0.9, lineY);
                            });
                        }
                    });

                    drawFooter();
                }

                // Append complete Educational Agenda table page if showAgendaAppendix is enabled
                if (options.showAgendaAppendix !== false && events.length > 0) {
                    doc.addPage();
                    drawHeader();

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10.5);
                    doc.setTextColor(15, 118, 110);
                    doc.text('LAMPIRAN REKAPITULASI AGENDA PENDIDIKAN', 105, 34, { align: 'center' });

                    const sortedEvents = [...events].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
                    const tableData = sortedEvents.map((ev, idx) => {
                        const sD = new Date(ev.startDate + 'T00:00:00');
                        const eD = new Date((ev.endDate || ev.startDate) + 'T00:00:00');
                        const hStart = getHijriDate(sD, settings.hijriAdjustment || 0);
                        const hEnd = getHijriDate(eD, settings.hijriAdjustment || 0);
                        const hijriText = ev.startDate === ev.endDate
                            ? `${hStart.day} ${hStart.month} ${hStart.year} H`
                            : `${hStart.day} ${hStart.month} - ${hEnd.day} ${hEnd.month} ${hEnd.year} H`;

                        const dateRangeMasehi = formatEventRange(ev.startDate, ev.endDate);

                        return [
                            idx + 1,
                            dateRangeMasehi,
                            hijriText,
                            ev.title,
                            ev.category || 'Kegiatan',
                            ev.description || '-'
                        ];
                    });

                    autoTable(doc, {
                        startY: 38,
                        margin: { left: 14, right: 14 },
                        head: [['No', 'Tanggal Masehi', 'Tanggal Hijriah', 'Nama Agenda / Kegiatan', 'Kategori', 'Keterangan']],
                        body: tableData,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [15, 118, 110],
                            textColor: [255, 255, 255],
                            fontSize: 7.5,
                            fontStyle: 'bold',
                            halign: 'center'
                        },
                        styles: {
                            fontSize: 7,
                            cellPadding: 1.8,
                            textColor: [40, 40, 40],
                            overflow: 'linebreak'
                        },
                        columnStyles: {
                            0: { cellWidth: 9, halign: 'center' },
                            1: { cellWidth: 32 },
                            2: { cellWidth: 34 },
                            3: { cellWidth: 46, fontStyle: 'bold' },
                            4: { cellWidth: 22, halign: 'center' },
                            5: { cellWidth: 39 }
                        }
                    });

                    // Signature on Appendix
                    const finalTableY = (doc as any).lastAutoTable?.finalY || 160;
                    const sigY = Math.min(finalTableY + 10, 250);
                    const tempat = (options.customTempat && options.customTempat.trim()) || resolveTempatPesantren(settings);
                    const tanggalCetak = formatDate(new Date());

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(30, 30, 30);
                    // Left: Mudir
                    doc.text('Mengetahui,', 45, sigY, { align: 'center' });
                    doc.setFont('helvetica', 'bold');
                    doc.text('Pengasuh / Pimpinan Pondok', 45, sigY + 4, { align: 'center' });
                    doc.text(settings.namaMudir ? `( ${settings.namaMudir} )` : '( ........................................... )', 45, sigY + 20, { align: 'center' });

                    // Right: Bagian Kurikulum
                    doc.setFont('helvetica', 'normal');
                    doc.text(`${tempat}, ${tanggalCetak}`, 165, sigY, { align: 'center' });
                    doc.setFont('helvetica', 'bold');
                    doc.text('Bagian Kurikulum & Akademik', 165, sigY + 4, { align: 'center' });
                    doc.text('( ........................................... )', 165, sigY + 20, { align: 'center' });

                    drawFooter();
                }

                doc.save(`${exportBaseName}-pdf-tabel.pdf`);
            } finally {
                setIsExporting(false);
            }
            return;
        }

        setTimeout(async () => {
            try {
                if (mode === 'pdf') {
                    await printExportFacade.downloadPdfImage({
                        elementId: 'calendar-print-area',
                        fileName: `${exportBaseName}-pdf-gambar`,
                        paperSize: 'A4',
                        target: 'report',
                    });
                } else if (mode === 'html') {
                    printExportFacade.downloadHtml({
                        elementId: 'calendar-print-area',
                        fileName: `${exportBaseName}-html`,
                        paperSize: 'A4',
                        target: 'report',
                    });
                } else {
                    await printExportFacade.printDialog({
                        elementId: 'calendar-print-area',
                        fileName: `${exportBaseName}-cetak`,
                        paperSize: 'A4',
                        target: 'report',
                    });
                }
            } finally {
                setTimeout(() => setIsExporting(false), 300);
            }
        }, 1200);
    };

    const renderCalendarGrid = () => {
        const gridCells = [];
        if (calendarDays.length === 0) return null;

        const firstDayOfWeek = calendarDays[0].dateObj.getDay(); 
        
        for (let i = 0; i < firstDayOfWeek; i++) {
            gridCells.push(<div key={`empty-${i}`} className="bg-gray-50/50 border border-transparent min-h-[70px] sm:min-h-[85px] md:min-h-[100px]"></div>);
        }
        
        calendarDays.forEach((dayData) => {
            const dateStr = dayData.dateStr || formatLocalDate(dayData.dateObj);
            const todayStr = formatLocalDate(new Date());
            const isToday = dateStr === todayStr;
            
            const dayEvents = monthEvents.filter(e => {
                const start = (e.startDate || '').split('T')[0];
                const end = (e.endDate || e.startDate || '').split('T')[0];
                return dateStr >= start && dateStr <= end;
            });

            const hijriArabic = dayData.hijriDayArabic || toArabicNumerals(dayData.hijriDay);
            const mainNum = primarySystem === 'Masehi' ? dayData.masehi : hijriArabic;
            const subNum = primarySystem === 'Masehi' ? hijriArabic : dayData.masehi;

            // Fasting Styling
            let fastingClass = '';
            let fastingIcon = null;
            if (showFasting && dayData.isFasting) {
                if (dayData.isRamadan) {
                    fastingClass = 'bg-amber-50/80 border-amber-200';
                    fastingIcon = <div className="absolute top-1 right-1 text-amber-600 text-[10px]" title="Bulan Suci Ramadhan"><i className="bi bi-moon-stars-fill"></i></div>;
                } else if (dayData.isFasting === 'Ayyamul Bidh') {
                    fastingClass = 'bg-blue-50/70 border-blue-200';
                    fastingIcon = <div className="absolute top-1 right-1 text-blue-500 text-[9px]" title="Puasa Sunnah Ayyamul Bidh (13-15)"><i className="bi bi-brightness-high-fill"></i></div>;
                } else if (dayData.isFasting === 'Senin-Kamis') {
                    fastingIcon = <div className="absolute top-1 right-1 text-emerald-500 text-[9px]" title="Puasa Sunnah Senin-Kamis"><i className="bi bi-droplet-fill"></i></div>;
                } else {
                    fastingClass = 'bg-purple-50/70 border-purple-200';
                    fastingIcon = <div className="absolute top-1 right-1 text-purple-600 text-[9px]" title={dayData.isFasting}><i className="bi bi-star-fill"></i></div>;
                }
            }

            gridCells.push(
                <div 
                    key={dateStr} 
                    onClick={() => { if(canWrite) { setSelectedDate(dateStr); setEditingEvent(null); setIsEventModalOpen(true); } }}
                    className={`border p-1 sm:p-2 min-h-[70px] sm:min-h-[85px] md:min-h-[100px] relative transition-colors ${canWrite ? 'cursor-pointer' : ''} ${fastingClass || 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                    {fastingIcon}
                    <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                        <div className={`text-xs sm:text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-sm' : 'text-gray-700'} ${primarySystem === 'Hijriah' ? 'font-serif text-sm sm:text-base' : ''}`}>
                            {mainNum}
                        </div>
                        <div 
                            className={`text-[10px] sm:text-xs font-bold leading-none ${primarySystem === 'Masehi' ? 'text-teal-700 font-serif' : 'text-gray-400 font-sans'}`}
                            title={primarySystem === 'Masehi' ? `Tanggal Hijriah: ${dayData.hijriDay} (${hijriArabic})` : `Tanggal Masehi: ${dayData.masehi}`}
                        >
                            {subNum}
                        </div>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                        {dayEvents.map(ev => (
                            <div 
                                key={ev.id} 
                                onClick={(e) => { e.stopPropagation(); setEditingEvent(ev); setIsEventModalOpen(true); }}
                                className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded truncate font-medium text-white cursor-pointer hover:opacity-80 shadow-2xs ${ev.color.startsWith('#') ? '' : ev.color}`}
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
        <div className="min-h-screen space-y-6 pb-20">
            <PageHeader
                eyebrow="Pendidikan"
                title="Kalender & Jadwal"
                description="Kelola agenda akademik, kegiatan pesantren, dan jadwal piket ibadah dari panel kalender yang lebih rapi."
                actions={
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-panduan', { detail: 'kalender' }))}
                        className="app-button-secondary px-3.5 py-2 text-xs flex items-center justify-center gap-1.5 font-bold hover:border-teal-300 hover:text-teal-800 transition-colors shadow-2xs"
                        title="Buka panduan lengkap sistem kalender akademik & jadwal piket ibadah santri"
                    >
                        <i className="bi bi-book-half text-teal-600"></i>
                        <span>Panduan Kalender</span>
                    </button>
                }
                tabs={
                    <HeaderTabs
                        value={activeView}
                        onChange={setActiveView}
                        tabs={[
                            { value: 'kalender', label: 'Kalender Akademik', icon: 'bi-calendar-range' },
                            { value: 'piket', label: 'Jadwal Piket Ibadah', icon: 'bi-clock-history' },
                        ]}
                    />
                }
            />

            {activeView === 'kalender' && (
                <div className="animate-fade-in space-y-4">
                    {/* Toolbar & Actions */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* View Switcher: Grid vs Agenda */}
                                <div className="inline-flex bg-gray-100 p-1 rounded-xl shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => setCalendarSubView('grid')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                            calendarSubView === 'grid'
                                                ? 'bg-white text-teal-700 shadow-xs'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <i className="bi bi-grid-3x3"></i>
                                        <span>Grid Bulanan</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCalendarSubView('agenda')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                            calendarSubView === 'agenda'
                                                ? 'bg-white text-teal-700 shadow-xs'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <i className="bi bi-view-list"></i>
                                        <span>Daftar Agenda</span>
                                    </button>
                                </div>

                                {/* Toggle Fasting & Fasting Guide */}
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                                    <label className="text-xs text-gray-700 font-bold cursor-pointer select-none flex items-center gap-1.5">
                                        <input 
                                            type="checkbox" 
                                            checked={showFasting} 
                                            onChange={e => setShowFasting(e.target.checked)} 
                                            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer" 
                                        />
                                        <i className="bi bi-moon-stars text-teal-600"></i>
                                        <span>Puasa Sunnah</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowFastingLegend(!showFastingLegend)}
                                        className="text-[11px] text-teal-700 hover:text-teal-900 font-bold hover:underline transition-colors ml-0.5"
                                        title="Lihat rincian puasa sunnah dan hisab"
                                    >
                                        (Panduan)
                                    </button>
                                </div>
                            </div>

                            {/* Desktop / Large Screen Action Buttons inline */}
                            <div className="hidden lg:flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => downloadIcsFile(filteredEvents, `agenda-pesantren-${new Date().getFullYear()}`, settings.namaPonpes)}
                                    disabled={filteredEvents.length === 0}
                                    className="bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 active:bg-teal-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Download kalender agenda (.ics) untuk Google Calendar, Apple Calendar, atau Outlook"
                                >
                                    <i className="bi bi-calendar-check"></i>
                                    <span>.ics ({filteredEvents.length})</span>
                                </button>

                                <button 
                                    type="button"
                                    disabled={isExporting} 
                                    onClick={() => setIsPrintModalOpen(true)} 
                                    className="bg-gray-800 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-900 active:bg-black flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs transition-colors"
                                >
                                    <i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-printer'}`}></i> 
                                    <span>{isExporting ? 'Memproses...' : 'Cetak & Export'}</span>
                                </button>

                                {canWrite && (
                                    <>
                                        <button 
                                            type="button"
                                            onClick={() => { setIsBulkModalOpen(true); }} 
                                            className="bg-teal-50 text-teal-700 border border-teal-200 px-3 py-2 rounded-xl text-xs font-bold hover:bg-teal-100 active:bg-teal-200 flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                        >
                                            <i className="bi bi-table"></i> 
                                            <span>Bulk Agenda</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setEditingEvent(null); setSelectedDate(''); setIsEventModalOpen(true); }} 
                                            className="bg-teal-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 active:bg-teal-800 flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
                                        >
                                            <i className="bi bi-plus-lg"></i> 
                                            <span>Tambah Agenda</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tablet Action Buttons Bar (sm & md screens) */}
                        <div className="hidden sm:grid lg:hidden grid-cols-4 gap-2 pt-2 border-t border-gray-100">
                            {canWrite && (
                                <button 
                                    type="button"
                                    onClick={() => { setEditingEvent(null); setSelectedDate(''); setIsEventModalOpen(true); }} 
                                    className="w-full justify-center bg-teal-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 active:bg-teal-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <i className="bi bi-plus-lg"></i> 
                                    <span className="truncate">Tambah Agenda</span>
                                </button>
                            )}
                            <button 
                                type="button"
                                disabled={isExporting} 
                                onClick={() => setIsPrintModalOpen(true)} 
                                className="w-full justify-center bg-gray-800 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-900 active:bg-black flex items-center gap-1.5 disabled:opacity-60 shadow-2xs transition-colors"
                            >
                                <i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-printer'}`}></i> 
                                <span className="truncate">{isExporting ? 'Proses...' : 'Cetak & Export'}</span>
                            </button>
                            {canWrite && (
                                <button 
                                    type="button"
                                    onClick={() => { setIsBulkModalOpen(true); }} 
                                    className="w-full justify-center bg-teal-50 text-teal-700 border border-teal-200 px-3 py-2 rounded-xl text-xs font-bold hover:bg-teal-100 active:bg-teal-200 flex items-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <i className="bi bi-table"></i> 
                                    <span className="truncate">Bulk Agenda</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => downloadIcsFile(filteredEvents, `agenda-pesantren-${new Date().getFullYear()}`, settings.namaPonpes)}
                                disabled={filteredEvents.length === 0}
                                className="w-full justify-center bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 active:bg-teal-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                                title="Download kalender agenda (.ics)"
                            >
                                <i className="bi bi-calendar-check"></i>
                                <span className="truncate">.ics ({filteredEvents.length})</span>
                            </button>
                        </div>

                        {/* Mobile Action Buttons (phones < 640px) */}
                        <div className="sm:hidden space-y-2 pt-2 border-t border-gray-100">
                            {canWrite && (
                                <button 
                                    type="button"
                                    onClick={() => { setEditingEvent(null); setSelectedDate(''); setIsEventModalOpen(true); }} 
                                    className="w-full justify-center bg-teal-600 text-white px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-700 active:bg-teal-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <i className="bi bi-plus-lg text-sm"></i> 
                                    <span>Tambah Agenda Baru</span>
                                </button>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    type="button"
                                    disabled={isExporting} 
                                    onClick={() => setIsPrintModalOpen(true)} 
                                    className="w-full justify-center bg-gray-800 text-white px-2 py-2 rounded-xl text-xs font-bold hover:bg-gray-900 active:bg-black flex items-center gap-1 disabled:opacity-60 shadow-2xs transition-colors"
                                >
                                    <i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-printer'}`}></i> 
                                    <span className="truncate">{isExporting ? '...' : 'Cetak'}</span>
                                </button>
                                {canWrite && (
                                    <button 
                                        type="button"
                                        onClick={() => { setIsBulkModalOpen(true); }} 
                                        className="w-full justify-center bg-teal-50 text-teal-700 border border-teal-200 px-2 py-2 rounded-xl text-xs font-bold hover:bg-teal-100 flex items-center gap-1 shadow-2xs transition-colors"
                                    >
                                        <i className="bi bi-table"></i> 
                                        <span className="truncate">Bulk</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => downloadIcsFile(filteredEvents, `agenda-pesantren-${new Date().getFullYear()}`, settings.namaPonpes)}
                                    disabled={filteredEvents.length === 0}
                                    className="w-full justify-center bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 px-2 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50"
                                    title="Download kalender agenda (.ics)"
                                >
                                    <i className="bi bi-calendar-check"></i>
                                    <span className="truncate">.ics ({filteredEvents.length})</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Panel for Kalender: Mobile Filter Drawer + Tablet/Desktop Layout */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                        {/* Mobile Search & Filter Button (md:hidden) */}
                        <div className="md:hidden flex items-center gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    placeholder="Cari agenda kegiatan..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full text-xs font-medium pl-8 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                />
                                <i className="bi bi-search absolute left-2.5 top-3 text-gray-400 text-xs"></i>
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs p-0.5 rounded-full"
                                        title="Hapus pencarian"
                                    >
                                        <i className="bi bi-x-circle-fill"></i>
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsMobileFilterOpen(true)}
                                className={`h-10 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all shrink-0 ${
                                    activeFiltersCount > 0
                                        ? 'bg-teal-50 border-teal-400 text-teal-800'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs'
                                }`}
                            >
                                <i className="bi bi-funnel-fill text-teal-600"></i>
                                <span>Filter</span>
                                {activeFiltersCount > 0 && (
                                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-600 px-1 text-[11px] font-bold text-white">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Tablet & Desktop Top Bar (hidden md:flex) */}
                        <div className="hidden md:flex flex-row items-center justify-between gap-2.5">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    placeholder="Cari judul atau deskripsi kegiatan..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full text-xs font-medium pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                                />
                                <i className="bi bi-search absolute left-2.5 top-2.5 text-gray-400 text-xs"></i>
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs p-0.5 rounded-full"
                                        title="Hapus pencarian"
                                    >
                                        <i className="bi bi-x-circle-fill"></i>
                                    </button>
                                )}
                            </div>

                            {/* Controls: Masehi/Hijriah & Academic Filter Toggle */}
                            <div className="flex items-center gap-2 shrink-0">
                                {/* System Switcher */}
                                <div className="inline-flex bg-gray-100 p-1 rounded-xl shadow-2xs">
                                    <button 
                                        type="button"
                                        onClick={() => setPrimarySystem('Masehi')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${primarySystem === 'Masehi' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
                                        title="Gunakan sistem penanggalan Masehi sebagai acuan utama"
                                    >
                                        Masehi
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setPrimarySystem('Hijriah')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${primarySystem === 'Hijriah' ? 'bg-white text-teal-700 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
                                        title="Gunakan sistem penanggalan Hijriah sebagai acuan utama"
                                    >
                                        Hijriah
                                    </button>
                                </div>

                                {/* Academic Filter Toggle Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsAcademicFilterExpanded(prev => !prev)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                                        academicFiltersCount > 0 || isAcademicFilterExpanded
                                            ? 'bg-teal-50 border-teal-300 text-teal-800'
                                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                    }`}
                                    title="Saring agenda berdasarkan Jenjang, Kelas, atau Rombel"
                                >
                                    <i className="bi bi-mortarboard text-xs"></i>
                                    <span>Kelas &amp; Rombel</span>
                                    {academicFiltersCount > 0 && (
                                        <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center">
                                            {academicFiltersCount}
                                        </span>
                                    )}
                                    <i className={`bi bi-chevron-${isAcademicFilterExpanded ? 'up' : 'down'} text-[10px]`}></i>
                                </button>

                                {isFilterActive && (
                                    <button 
                                        type="button"
                                        onClick={resetFilters} 
                                        className="text-xs text-red-600 hover:text-red-700 font-bold px-2.5 py-1.5 rounded-xl hover:bg-red-50 flex items-center gap-1 transition-colors"
                                        title="Reset seluruh filter"
                                    >
                                        <i className="bi bi-arrow-counterclockwise"></i>
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Category Filter Pills (Horizontal Scrollable & Touch-Friendly) */}
                        <div className="pt-1">
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar text-xs">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider shrink-0 mr-1 hidden sm:inline">
                                    Kategori:
                                </span>
                                {([
                                    { key: 'Semua', label: 'Semua', color: 'teal' },
                                    { key: 'Kegiatan', label: 'Kegiatan', color: 'blue' },
                                    { key: 'Ujian', label: 'Ujian', color: 'red' },
                                    { key: 'Libur', label: 'Libur', color: 'amber' },
                                    { key: 'Rapat', label: 'Rapat', color: 'purple' },
                                    { key: 'Lainnya', label: 'Lainnya', color: 'gray' },
                                ] as const).map(cat => {
                                    const isSelected = filterCategory === cat.key;
                                    const count = categoryCounts[cat.key] || 0;
                                    return (
                                        <button
                                            key={cat.key}
                                            type="button"
                                            onClick={() => setFilterCategory(cat.key)}
                                            className={`px-3 py-1 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                                                isSelected
                                                    ? 'bg-teal-700 text-white shadow-xs'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                            }`}
                                        >
                                            <span>{cat.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-600'
                                            }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Collapsible Academic Filter Section (Jenjang, Kelas, Rombel) - Tablet & Desktop */}
                        {isAcademicFilterExpanded && (
                            <div className="hidden md:block p-3 bg-teal-50/60 rounded-xl border border-teal-100 space-y-2 animate-fade-in">
                                <div className="flex items-center justify-between text-[11px] font-bold text-teal-900 border-b border-teal-200/40 pb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <i className="bi bi-funnel text-teal-600"></i>
                                        Saring Berdasarkan Tingkat Pendidikan
                                    </span>
                                    {academicFiltersCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilterJenjangId(0);
                                                setFilterKelasId(0);
                                                setFilterRombelId(0);
                                            }}
                                            className="text-red-600 hover:text-red-700 font-bold hover:underline"
                                        >
                                            Reset Kelas
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Jenjang</label>
                                        <select 
                                            value={filterJenjangId} 
                                            onChange={e => {
                                                setFilterJenjangId(Number(e.target.value));
                                                setFilterKelasId(0);
                                                setFilterRombelId(0);
                                            }}
                                            className="w-full text-xs font-medium p-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none shadow-2xs"
                                        >
                                            <option value={0}>Semua Jenjang</option>
                                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kelas</label>
                                        <select 
                                            value={filterKelasId} 
                                            onChange={e => {
                                                setFilterKelasId(Number(e.target.value));
                                                setFilterRombelId(0);
                                            }}
                                            disabled={!filterJenjangId}
                                            className="w-full text-xs font-medium p-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none shadow-2xs disabled:opacity-50"
                                        >
                                            <option value={0}>Semua Kelas</option>
                                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Rombel</label>
                                        <select 
                                            value={filterRombelId} 
                                            onChange={e => setFilterRombelId(Number(e.target.value))}
                                            disabled={!filterKelasId}
                                            className="w-full text-xs font-medium p-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none shadow-2xs disabled:opacity-50"
                                        >
                                            <option value={0}>Semua Rombel</option>
                                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Active Filter Chips (Removable with one tap) */}
                        {isFilterActive && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs border-t border-gray-100">
                                <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Filter Aktif:</span>
                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-gray-800 rounded-full font-medium text-[11px] border border-gray-200">
                                        <span>"{searchQuery}"</span>
                                        <button type="button" onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-700">
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </span>
                                )}
                                {filterCategory !== 'Semua' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-800 rounded-full font-medium text-[11px] border border-teal-200">
                                        <span>Kategori: {filterCategory}</span>
                                        <button type="button" onClick={() => setFilterCategory('Semua')} className="text-teal-600 hover:text-teal-900">
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </span>
                                )}
                                {filterJenjangId > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-full font-medium text-[11px] border border-blue-200">
                                        <span>Jenjang: {settings.jenjang.find(j => j.id === filterJenjangId)?.nama}</span>
                                        <button type="button" onClick={() => { setFilterJenjangId(0); setFilterKelasId(0); setFilterRombelId(0); }} className="text-blue-600 hover:text-blue-900">
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </span>
                                )}
                                {filterKelasId > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-800 rounded-full font-medium text-[11px] border border-purple-200">
                                        <span>Kelas: {availableKelas.find(k => k.id === filterKelasId)?.nama}</span>
                                        <button type="button" onClick={() => { setFilterKelasId(0); setFilterRombelId(0); }} className="text-purple-600 hover:text-purple-900">
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </span>
                                )}
                                {filterRombelId > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full font-medium text-[11px] border border-emerald-200">
                                        <span>Rombel: {availableRombel.find(r => r.id === filterRombelId)?.nama}</span>
                                        <button type="button" onClick={() => setFilterRombelId(0)} className="text-emerald-600 hover:text-emerald-900">
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline ml-1"
                                >
                                    Reset Semua
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Standard Mobile Filter Drawer for Kalender Akademik */}
                    <MobileFilterDrawer
                        isOpen={isMobileFilterOpen}
                        onClose={() => setIsMobileFilterOpen(false)}
                        title="Filter Kalender Akademik"
                        onReset={resetFilters}
                        onApply={() => setIsMobileFilterOpen(false)}
                    >
                        <div className="space-y-4">
                            {/* Search */}
                            <div className="bg-slate-50 space-y-1.5 rounded-2xl p-3.5 border border-slate-200/60">
                                <label className="text-xs font-bold text-slate-700 block">Cari Agenda Kegiatan</label>
                                <div className="relative">
                                    <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                    <input
                                        type="text"
                                        placeholder="Cari judul atau deskripsi..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full text-xs font-medium pl-8 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                                        >
                                            <i className="bi bi-x-circle-fill"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Sistem Acuan Tanggal */}
                            <div className="bg-slate-50 space-y-2 rounded-2xl p-3.5 border border-slate-200/60">
                                <label className="text-xs font-bold text-slate-700 block">Sistem Penanggalan Acuan</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPrimarySystem('Masehi')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                            primarySystem === 'Masehi'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-calendar3"></i>
                                        <span>Masehi (Gregorian)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPrimarySystem('Hijriah')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                            primarySystem === 'Hijriah'
                                                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-moon-stars"></i>
                                        <span>Hijriah (Qomariyah)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Kategori Agenda */}
                            <div className="bg-slate-50 space-y-2 rounded-2xl p-3.5 border border-slate-200/60">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-700">Kategori Agenda</label>
                                    {filterCategory !== 'Semua' && (
                                        <button
                                            type="button"
                                            onClick={() => setFilterCategory('Semua')}
                                            className="text-[11px] text-teal-700 font-bold hover:underline"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {([
                                        { key: 'Semua', label: 'Semua Kategori' },
                                        { key: 'Kegiatan', label: 'Kegiatan' },
                                        { key: 'Ujian', label: 'Ujian' },
                                        { key: 'Libur', label: 'Libur' },
                                        { key: 'Rapat', label: 'Rapat' },
                                        { key: 'Lainnya', label: 'Lainnya' },
                                    ] as const).map(cat => {
                                        const isSelected = filterCategory === cat.key;
                                        const count = categoryCounts[cat.key] || 0;
                                        return (
                                            <button
                                                key={cat.key}
                                                type="button"
                                                onClick={() => setFilterCategory(cat.key)}
                                                className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                                                    isSelected
                                                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{cat.label}</span>
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tingkat Pendidikan (Jenjang, Kelas, Rombel) */}
                            <div className="bg-slate-50 space-y-3 rounded-2xl p-3.5 border border-slate-200/60">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-700">Jenjang, Kelas &amp; Rombel</label>
                                    {(filterJenjangId > 0 || filterKelasId > 0 || filterRombelId > 0) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilterJenjangId(0);
                                                setFilterKelasId(0);
                                                setFilterRombelId(0);
                                            }}
                                            className="text-[11px] text-red-600 font-bold hover:underline"
                                        >
                                            Reset Kelas
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jenjang</label>
                                        <select
                                            value={filterJenjangId}
                                            onChange={e => {
                                                setFilterJenjangId(Number(e.target.value));
                                                setFilterKelasId(0);
                                                setFilterRombelId(0);
                                            }}
                                            className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                        >
                                            <option value={0}>Semua Jenjang</option>
                                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kelas</label>
                                        <select
                                            value={filterKelasId}
                                            onChange={e => {
                                                setFilterKelasId(Number(e.target.value));
                                                setFilterRombelId(0);
                                            }}
                                            disabled={!filterJenjangId}
                                            className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-50"
                                        >
                                            <option value={0}>Semua Kelas</option>
                                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rombel</label>
                                        <select
                                            value={filterRombelId}
                                            onChange={e => setFilterRombelId(Number(e.target.value))}
                                            disabled={!filterKelasId}
                                            className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-50"
                                        >
                                            <option value={0}>Semua Rombel</option>
                                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Result Count Preview */}
                            <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-3 text-center">
                                <div className="text-[10px] font-black uppercase tracking-wider text-teal-700">Hasil Saringan Agenda</div>
                                <div className="text-xl font-black text-teal-900 mt-0.5">
                                    {filteredEvents.length} <span className="text-xs font-bold text-teal-700">Agenda</span>
                                </div>
                            </div>
                        </div>
                    </MobileFilterDrawer>
                    
                    {showFastingLegend && (
                        <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-2xl p-4 shadow-xs space-y-3 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-teal-200/60 pb-2">
                                <div className="flex items-center gap-2">
                                    <i className="bi bi-moon-stars-fill text-teal-700"></i>
                                    <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider">Panduan Jadwal Puasa Sunnah & Wajib</h4>
                                </div>
                                <button
                                    onClick={() => setShowFastingLegend(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <i className="bi bi-x-lg text-xs"></i>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                                <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-start gap-2.5 shadow-2xs">
                                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                        <i className="bi bi-moon-stars-fill text-xs"></i>
                                    </div>
                                    <div>
                                        <div className="font-bold text-amber-900">Puasa Ramadhan</div>
                                        <div className="text-[11px] text-gray-500">Wajib 1 bulan penuh (1 - 29/30 Ramadhan).</div>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-white rounded-xl border border-blue-200 flex items-start gap-2.5 shadow-2xs">
                                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                        <i className="bi bi-brightness-high-fill text-xs"></i>
                                    </div>
                                    <div>
                                        <div className="font-bold text-blue-900">Ayyamul Bidh</div>
                                        <div className="text-[11px] text-gray-500">Tanggal 13, 14, 15 tiap bulan Hijriah (kecuali hari tasyrik).</div>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-start gap-2.5 shadow-2xs">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <i className="bi bi-droplet-fill text-xs"></i>
                                    </div>
                                    <div>
                                        <div className="font-bold text-emerald-900">Senin & Kamis</div>
                                        <div className="text-[11px] text-gray-500">Sunnah mingguan rutin bagi para santri & asatidz.</div>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-white rounded-xl border border-purple-200 flex items-start gap-2.5 shadow-2xs">
                                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                        <i className="bi bi-star-fill text-xs"></i>
                                    </div>
                                    <div>
                                        <div className="font-bold text-purple-900">Puasa Khusus</div>
                                        <div className="text-[11px] text-gray-500">Tasu'a-Asyura (9-10 Muharram), Arafah (9 Dzulhijjah), & 6 hari Syawal.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showFasting && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-xl text-xs text-yellow-800 flex items-start gap-2">
                            <i className="bi bi-info-circle-fill mt-0.5"></i>
                            <div>
                                <strong>Tanbih:</strong> Tanggal Hijriah, Awal Ramadhan, dan Hari Raya dalam kalender ini adalah hasil <em>hisab/estimasi</em> algoritma. 
                                Kepastian tanggal ibadah tetap mengikuti keputusan Sidang Isbat Pemerintah / otoritas setempat.
                            </div>
                        </div>
                    )}

                    {calendarSubView === 'grid' ? (
                        <>
                            <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden">
                                <div className="flex items-center justify-between p-2.5 sm:p-4 border-b bg-gray-50/70 gap-2">
                                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                        <button 
                                            onClick={handlePrev} 
                                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors text-gray-700" 
                                            title="Bulan Sebelumnya"
                                        >
                                            <i className="bi bi-chevron-left text-xs sm:text-sm"></i>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (primarySystem === 'Masehi') {
                                                    const now = new Date();
                                                    setAnchorDate(new Date(now.getFullYear(), now.getMonth(), 1));
                                                } else {
                                                    setAnchorDate(findStartOfHijriMonth(new Date(), hijriAdjustment));
                                                }
                                            }}
                                            className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold bg-white hover:bg-gray-100 active:bg-gray-200 border border-gray-300 rounded-lg text-gray-700 transition-colors shadow-2xs whitespace-nowrap"
                                            title="Kembali ke bulan ini"
                                        >
                                            Bulan Ini
                                        </button>
                                    </div>
                                    <div className="text-center px-1 flex-1 min-w-0">
                                        <h2 className="text-sm sm:text-lg md:text-xl font-black text-gray-800 tracking-tight truncate">{headerInfo.main}</h2>
                                        <p className="text-[10px] sm:text-xs text-teal-600 font-bold mt-0.5 truncate">{headerInfo.sub}</p>
                                    </div>
                                    <button 
                                        onClick={handleNext} 
                                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors text-gray-700 shrink-0" 
                                        title="Bulan Berikutnya"
                                    >
                                        <i className="bi bi-chevron-right text-xs sm:text-sm"></i>
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 bg-gray-100 border-b">
                                    {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day, i) => (
                                        <div key={day} className={`py-2 px-1 sm:p-3 text-center font-bold text-[10px] sm:text-xs truncate ${i === 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            <span className="hidden sm:inline">{day}</span>
                                            <span className="sm:hidden">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][i]}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 bg-gray-200 gap-px border-b">
                                    {renderCalendarGrid()}
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-2xs border border-gray-200 space-y-3">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <i className="bi bi-card-checklist text-teal-600"></i>
                                        <span>Agenda Bulan Ini</span>
                                    </h3>
                                    <span className="text-xs text-gray-500 font-semibold">{monthEvents.length} agenda aktif</span>
                                </div>
                                {monthEvents.length > 0 ? (
                                    <ul className="space-y-2">
                                        {[...monthEvents].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(ev => {
                                            const jenjangObj = ev.jenjangId ? settings.jenjang.find(j => j.id === ev.jenjangId) : null;
                                            const kelasObj = ev.kelasId ? settings.kelas.find(k => k.id === ev.kelasId) : null;
                                            const rombelObj = ev.rombelId ? settings.rombel.find(r => r.id === ev.rombelId) : null;

                                            return (
                                                <li key={ev.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl group border border-transparent hover:border-gray-200 transition-all">
                                                    <div className={`w-3 h-3 rounded-full shrink-0 ${ev.color.startsWith('#') ? '' : ev.color}`} style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}></div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="font-bold text-gray-800 text-xs flex items-center gap-2">
                                                            <span>{ev.title}</span>
                                                            {jenjangObj && (
                                                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-200">
                                                                    {jenjangObj.nama}
                                                                </span>
                                                            )}
                                                            {kelasObj && (
                                                                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-200">
                                                                    {kelasObj.nama}
                                                                </span>
                                                            )}
                                                            {rombelObj && (
                                                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">
                                                                    {rombelObj.nama}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                                                            <span>{formatDate(ev.startDate)} {ev.startDate !== ev.endDate && ` - ${formatDate(ev.endDate)}`}</span>
                                                            <span className="px-1.5 py-0.2 bg-gray-100 rounded text-[9px] uppercase font-bold text-gray-600 border">{ev.category}</span>
                                                            {ev.description && <span className="text-gray-400 truncate">• {ev.description}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => downloadIcsFile([ev], `agenda-${ev.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, settings.namaPonpes)}
                                                            className="text-teal-600 p-1 hover:bg-teal-50 rounded"
                                                            title="Download .ics"
                                                        >
                                                            <i className="bi bi-calendar2-event text-xs"></i>
                                                        </button>
                                                        {canWrite && (
                                                            <button onClick={() => { setEditingEvent(ev); setIsEventModalOpen(true); }} className="text-blue-600 p-1 hover:bg-blue-50 rounded" title="Edit">
                                                                <i className="bi bi-pencil-square text-xs"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-gray-400 italic text-xs py-4 text-center">Tidak ada agenda di bulan ini yang sesuai filter.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Agenda & Timeline View */
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
                                        <i className="bi bi-view-list text-teal-600"></i>
                                        <span>Daftar Seluruh Agenda & Kegiatan</span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Menampilkan {filteredEvents.length} agenda sesuai filter yang dipilih.
                                    </p>
                                </div>
                                <button
                                    onClick={() => downloadIcsFile(filteredEvents, `semua-agenda-${new Date().getFullYear()}`, settings.namaPonpes)}
                                    disabled={filteredEvents.length === 0}
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                                >
                                    <i className="bi bi-calendar-check"></i>
                                    Download Semua (.ics)
                                </button>
                            </div>

                            {filteredEvents.length > 0 ? (
                                <div className="space-y-3">
                                    {[...filteredEvents]
                                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                                        .map(ev => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const start = new Date(ev.startDate);
                                            start.setHours(0, 0, 0, 0);
                                            const end = new Date(ev.endDate || ev.startDate);
                                            end.setHours(23, 59, 59, 999);

                                            let statusBadge = { label: 'Selesai', color: 'bg-gray-100 text-gray-600 border-gray-200' };
                                            if (today >= start && today <= end) {
                                                statusBadge = { label: 'Sedang Berlangsung', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
                                            } else if (today < start) {
                                                const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                                statusBadge = {
                                                    label: diffDays === 1 ? 'Besok' : `${diffDays} hari lagi`,
                                                    color: 'bg-blue-100 text-blue-800 border-blue-200',
                                                };
                                            }

                                            const jenjangObj = ev.jenjangId ? settings.jenjang.find(j => j.id === ev.jenjangId) : null;
                                            const kelasObj = ev.kelasId ? settings.kelas.find(k => k.id === ev.kelasId) : null;
                                            const rombelObj = ev.rombelId ? settings.rombel.find(r => r.id === ev.rombelId) : null;
                                            const hijriStart = getHijriDate(start, hijriAdjustment);

                                            return (
                                                <div
                                                    key={ev.id}
                                                    className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-16 h-16 rounded-xl bg-teal-50 border border-teal-200 flex flex-col items-center justify-center shrink-0 text-center">
                                                            <span className="text-[10px] uppercase font-bold text-teal-700">
                                                                {start.toLocaleDateString('id-ID', { month: 'short' })}
                                                            </span>
                                                            <span className="text-xl font-black text-teal-900 leading-tight">
                                                                {start.getDate()}
                                                            </span>
                                                            <span className="text-[9px] text-gray-500 font-medium">
                                                                {start.getFullYear()}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h4 className="text-sm font-bold text-gray-900">
                                                                    {ev.title}
                                                                </h4>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
                                                                    {statusBadge.label}
                                                                </span>
                                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-bold uppercase border border-gray-200">
                                                                    {ev.category}
                                                                </span>
                                                            </div>

                                                            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                <span>
                                                                    <i className="bi bi-calendar3 mr-1 text-teal-600"></i>
                                                                    {formatDate(ev.startDate)} {ev.startDate !== ev.endDate && ` - ${formatDate(ev.endDate)}`}
                                                                </span>
                                                                <span>
                                                                    <i className="bi bi-moon mr-1 text-amber-600"></i>
                                                                    {hijriStart.day} {hijriStart.month} {hijriStart.year} H
                                                                </span>
                                                            </div>

                                                            {ev.description && (
                                                                <p className="text-xs text-gray-600 pt-0.5">
                                                                    {ev.description}
                                                                </p>
                                                            )}

                                                            {(jenjangObj || kelasObj || rombelObj) && (
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                                    {jenjangObj && (
                                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                                                                            Jenjang: {jenjangObj.nama}
                                                                        </span>
                                                                    )}
                                                                    {kelasObj && (
                                                                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200">
                                                                            Kelas: {kelasObj.nama}
                                                                        </span>
                                                                    )}
                                                                    {rombelObj && (
                                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                                                                            Rombel: {rombelObj.nama}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadIcsFile([ev], `agenda-${ev.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, settings.namaPonpes)}
                                                            className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center gap-1.5 transition-colors"
                                                            title="Download .ics agenda ini"
                                                        >
                                                            <i className="bi bi-calendar-event"></i>
                                                            .ics
                                                        </button>
                                                        {canWrite && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setEditingEvent(ev); setIsEventModalOpen(true); }}
                                                                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1 transition-colors"
                                                                >
                                                                    <i className="bi bi-pencil"></i>
                                                                    Edit
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-xl">
                                        <i className="bi bi-calendar-x"></i>
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-700">Tidak Ada Agenda Ditemukan</h4>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        Tidak ada agenda yang cocok dengan filter atau kata kunci pencarian yang sedang aktif.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
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
                settings={settings}
            />

            <BulkEventModal 
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSave={handleBulkSaveEvents}
            />

            <PrintModal 
                isOpen={isPrintModalOpen} 
                onClose={() => setIsPrintModalOpen(false)} 
                onExportPdfTable={handleExportPdfTableRequest}
                settings={settings}
                events={events}
                year={anchorDate.getFullYear()}
                isProcessing={isExporting}
            />

            {/* Hidden Print Area - Accessible by html2canvas but invisible to user */}
            <div className="fixed -left-[10000px] top-0 -z-[100] pointer-events-none h-auto w-auto">
                {printConfig && (
                    <div id="calendar-print-area" className="bg-white">
                        <CalendarPrintTemplate 
                            year={anchorDate.getFullYear()} 
                            startMonth={printConfig.startMonth}
                            startYear={printConfig.startYear}
                            endMonth={printConfig.endMonth}
                            endYear={printConfig.endYear}
                            events={events} 
                            settings={settings} 
                            theme={printConfig.theme}
                            layout={printConfig.layout}
                            primarySystem={printConfig.primarySystem}
                            showKop={printConfig.showKop}
                            showAgendaAppendix={printConfig.showAgendaAppendix ?? true}
                            customTempat={printConfig.customTempat}
                            customImage={printConfig.customImage}
                            imagePosition={printConfig.imagePosition}
                            periodLabelMasehi={printConfig.periodLabelMasehi}
                            periodLabelHijriah={printConfig.periodLabelHijriah}
                            useAcademicPeriodLabel={printConfig.useAcademicPeriodLabel}
                            academicHijriStartMonthIndex={printConfig.academicHijriStartMonthIndex}
                            academicHijriStartYear={printConfig.academicHijriStartYear}
                        />
                    </div>
                )}
            </div>

            {/* Native Print Area - Only for browser print */}
            <div className="hidden print:block">
                {printConfig && (
                    <CalendarPrintTemplate 
                        year={anchorDate.getFullYear()} 
                        startMonth={printConfig.startMonth}
                        startYear={printConfig.startYear}
                        endMonth={printConfig.endMonth}
                        endYear={printConfig.endYear}
                        events={events} 
                        settings={settings} 
                        theme={printConfig.theme}
                        layout={printConfig.layout}
                        primarySystem={printConfig.primarySystem}
                        showKop={printConfig.showKop}
                        showAgendaAppendix={printConfig.showAgendaAppendix ?? true}
                        customTempat={printConfig.customTempat}
                        customImage={printConfig.customImage}
                        imagePosition={printConfig.imagePosition}
                        periodLabelMasehi={printConfig.periodLabelMasehi}
                        periodLabelHijriah={printConfig.periodLabelHijriah}
                        useAcademicPeriodLabel={printConfig.useAcademicPeriodLabel}
                        academicHijriStartMonthIndex={printConfig.academicHijriStartMonthIndex}
                        academicHijriStartYear={printConfig.academicHijriStartYear}
                    />
                )}
            </div>
        </div>
    );
};

export default Kalender;
