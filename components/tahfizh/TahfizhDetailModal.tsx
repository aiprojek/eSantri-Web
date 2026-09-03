import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Santri, TahfizhRecord } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { TahfizhReportTemplate } from './TahfizhReportTemplate';
import { TahfizhSyahadahTemplate, SyahadahTheme } from './TahfizhSyahadahTemplate';
import { TahfizhMushafGrid } from './TahfizhMushafGrid';
import { TahfizhWaShareModal } from './TahfizhWaShareModal';
import { TahfizhMunaqosyahExamModal } from './TahfizhMunaqosyahExamModal';
import { TahfizhSemesterRaporTemplate } from './TahfizhSemesterRaporTemplate';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { formatTanggalDokumen, DateFormatMode } from '../../utils/formatters';
import { TAHFIZH_CATATAN_PRESETS } from '../../data/tahfizhCatatanPresets';

interface TahfizhDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
    records: TahfizhRecord[];
}

const PRESET_DOC_TITLES = [
    "SYAHADAH TAHFIZH AL-QUR'AN",
    "PIAGAM PENGHARGAAN TAHFIZH",
    "SERTIFIKAT KELULUSAN TAHFIZH",
    "IJAZAH TAHFIZH AL-QUR'AN",
    "PIAGAM KHATAM AL-QUR'AN"
];

const PRESET_CAPAIAN = [
    "Khatam Juz 30 (Juz 'Amma)",
    "Khatam Al-Qur'an 30 Juz",
    "Tasmi' 1 Kali Duduk Juz 30",
    "Ujian Munaqosyah Tahfizh",
    "Khatam 5 Juz Pertama (Juz 1 - 5)",
    "Khatam 10 Juz (Juz 1 - 10)"
];

const STORAGE_KEY = 'esantri_syahadah_prefs_v1';

export const TahfizhDetailModal: React.FC<TahfizhDetailModalProps> = ({ isOpen, onClose, santri, records }) => {
    const { showConfirmation, showToast, currentUser, settings, onUpdateSettings } = useAppContext();
    const { onDeleteTahfizh } = useSantriContext();
    const [activeTab, setActiveTab] = useState<'timeline' | 'grid' | 'munaqosyah' | 'rapor' | 'syahadah'>('timeline');
    const [showPrintConfig, setShowPrintConfig] = useState(false);

    // Modal Sub-states
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [isMunaqosyahModalOpen, setIsMunaqosyahModalOpen] = useState(false);
    const [selectedExamJuz, setSelectedExamJuz] = useState<number>(30);

    // Rapor Semester State
    const [raporSemester, setRaporSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [raporTahunAjaran, setRaporTahunAjaran] = useState<string>('2026/2027');
    const [raporTanggal, setRaporTanggal] = useState<string>(settings.tanggalRaporDefault || new Date().toISOString().split('T')[0]);
    const [raporTempat, setRaporTempat] = useState<string>(settings.tempatRaporDefault || '');
    const [raporFormatMode, setRaporFormatMode] = useState<DateFormatMode>(settings.formatTanggalRaporDefault || 'masehi');
    const [raporManualHijri, setRaporManualHijri] = useState<string>(settings.manualHijriRaporDefault || '');
    const [isSavingUniversalRapor, setIsSavingUniversalRapor] = useState<boolean>(false);

    const handleSaveUniversalRaporDate = async () => {
        try {
            setIsSavingUniversalRapor(true);
            await onUpdateSettings({
                ...settings,
                tanggalRaporDefault: raporTanggal,
                tempatRaporDefault: raporTempat.trim(),
                formatTanggalRaporDefault: raporFormatMode,
                manualHijriRaporDefault: raporManualHijri.trim()
            });
            showToast('Titimangsa Rapor (Tanggal, Tempat & Format) berhasil disimpan sebagai default universal!', 'success');
        } catch (err) {
            showToast('Gagal menyimpan default: ' + String(err), 'error');
        } finally {
            setIsSavingUniversalRapor(false);
        }
    };

    const [raporPetaMode, setRaporPetaMode] = useState<'grid30' | 'perSurah'>('grid30');
    const [raporPetaRentangType, setRaporPetaRentangType] = useState<'single' | 'range'>('single');
    const [raporPetaJuzStart, setRaporPetaJuzStart] = useState<number>(santri.targetJuz && santri.targetJuz <= 30 ? santri.targetJuz : 30);
    const [raporPetaJuzEnd, setRaporPetaJuzEnd] = useState<number>(santri.targetJuz && santri.targetJuz <= 30 ? santri.targetJuz : 30);
    const [raporCatatan, setRaporCatatan] = useState<string>(
        "Alhamdulillah ananda menunjukkan kesungguhan dan adab yang baik dalam halaqah tahfizh. Mohon terus didampingi muraja'ah di rumah."
    );

    // Penandatangan Rapor State (3 Pihak: Orang Tua, Muhaffizh, Mudir)
    // 1. Orang Tua / Wali
    const [raporOrangTuaMode, setRaporOrangTuaMode] = useState<'auto' | 'manual' | 'dots'>('auto');
    const [raporCustomOrangTuaName, setRaporCustomOrangTuaName] = useState<string>(
        santri.namaWali || santri.namaAyah || santri.namaIbu || ''
    );
    const [raporCustomOrangTuaLabel, setRaporCustomOrangTuaLabel] = useState<string>('Orang Tua / Wali Santri');

    // 2. Pembimbing / Muhaffizh
    const [raporMuhaffizhMode, setRaporMuhaffizhMode] = useState<'auto' | 'select' | 'manual' | 'dots'>('auto');
    const [raporSelectedMuhaffizhId, setRaporSelectedMuhaffizhId] = useState<number>(0);
    const [raporCustomMuhaffizhName, setRaporCustomMuhaffizhName] = useState<string>('');
    const [raporCustomMuhaffizhLabel, setRaporCustomMuhaffizhLabel] = useState<string>('Pembimbing Halaqah');

    // 3. Mudir / Pengasuh Pondok
    const [raporMudirMode, setRaporMudirMode] = useState<'auto' | 'select' | 'manual' | 'dots'>('auto');
    const [raporSelectedMudirId, setRaporSelectedMudirId] = useState<number>(0);
    const [raporCustomMudirName, setRaporCustomMudirName] = useState<string>('');
    const [raporCustomMudirJabatan, setRaporCustomMudirJabatan] = useState<string>('Pimpinan Pondok Pesantren');
    
    // Load saved Syahadah preferences from localStorage if available
    const getSavedPrefs = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            // ignore
        }
        return {};
    };

    const savedPrefs = getSavedPrefs();

    // Lookups for Halaqah and Wali Kelas for current santri
    const santriHalaqah = useMemo(() => {
        return settings.kelompokHalaqah?.find(h => h.id === santri.halaqahId || h.santriIds?.includes(santri.id));
    }, [settings.kelompokHalaqah, santri.halaqahId, santri.id]);

    const halaqahMuhaffizh = useMemo(() => {
        if (!santriHalaqah?.muhaffizhId) return null;
        return settings.tenagaPengajar.find(t => t.id === santriHalaqah.muhaffizhId) || null;
    }, [santriHalaqah, settings.tenagaPengajar]);

    const santriRombel = useMemo(() => {
        return settings.rombel.find(r => r.id === santri.rombelId);
    }, [settings.rombel, santri.rombelId]);

    const santriKelas = useMemo(() => {
        return santriRombel ? settings.kelas.find(k => k.id === santriRombel.kelasId) : null;
    }, [settings.kelas, santriRombel]);

    const waliKelasTeacher = useMemo(() => {
        if (!santriRombel?.waliKelasId) return null;
        return settings.tenagaPengajar.find(t => t.id === santriRombel.waliKelasId) || null;
    }, [santriRombel, settings.tenagaPengajar]);

    // Syahadah Config State
    const [syahadahTheme, setSyahadahTheme] = useState<SyahadahTheme>(savedPrefs.theme || 'classic');
    const [syahadahDocTitle, setSyahadahDocTitle] = useState<string>(savedPrefs.docTitle || "SYAHADAH TAHFIZH AL-QUR'AN");
    const [customDocTitle, setCustomDocTitle] = useState<string>(savedPrefs.customDocTitle || '');
    const [isCustomDocTitle, setIsCustomDocTitle] = useState<boolean>(savedPrefs.isCustomDocTitle || false);
    
    // Kalimat di Atas Nama Santri (Kustom / Preset)
    const PRESET_KALIMAT_PENGANTAR = [
        "Dewan Asatidz & Lembaga Tahfizh Al-Qur'an menerangkan dengan sebenarnya bahwa:",
        "Diberikan sebagai bukti kelulusan dan penghargaan resmi kepada:",
        "Atas berkat rahmat Allah SWT, Majelis Dewan Guru & Pengasuh menerangkan bahwa:",
        "Dengan memohon ridha Allah SWT, Dewan Penguji Tahfizh menerangkan bahwa:",
        "Piagam Penghargaan & Kelulusan ini dengan penuh rasa bangga dianugerahkan kepada:",
        "Diberikan kepada santri berprestasi hafalan Al-Qur'an:",
        "Telah menyelesaikan setoran dan ujian tasmi' Al-Qur'an:"
    ];
    const [kalimatPengantar, setKalimatPengantar] = useState<string>(savedPrefs.kalimatPengantar || PRESET_KALIMAT_PENGANTAR[0]);
    const [customKalimatPengantar, setCustomKalimatPengantar] = useState<string>(savedPrefs.customKalimatPengantar || '');
    const [isCustomKalimat, setIsCustomKalimat] = useState<boolean>(savedPrefs.isCustomKalimat || false);
    const [showWatermarkLogo, setShowWatermarkLogo] = useState<boolean>(savedPrefs.showWatermarkLogo !== undefined ? savedPrefs.showWatermarkLogo : true);
    
    // Capaian Modes: 'preset' | 'rentang' | 'custom'
    const [capaianMode, setCapaianMode] = useState<'preset' | 'rentang' | 'custom'>(savedPrefs.capaianMode || 'preset');
    const [syahadahType, setSyahadahType] = useState<string>(savedPrefs.syahadahType || "Khatam Juz 30 (Juz 'Amma)");
    const [juzStart, setJuzStart] = useState<number>(savedPrefs.juzStart || 1);
    const [juzEnd, setJuzEnd] = useState<number>(savedPrefs.juzEnd || 5);
    const [customCapaian, setCustomCapaian] = useState<string>(savedPrefs.customCapaian || '');
    
    const [syahadahPredikat, setSyahadahPredikat] = useState<string>(savedPrefs.predikat || 'Mumtaz (Sangat Baik / Istimewa)');
    const [syahadahCatatan, setSyahadahCatatan] = useState<string>(savedPrefs.catatan || 'Tuntas tasmi\' dan mutaba\'ah dengan tajwid yang baik.');
    const [syahadahNomor, setSyahadahNomor] = useState<string>('');
    const [syahadahTanggal, setSyahadahTanggal] = useState<string>(savedPrefs.tanggal || settings.tanggalSyahadahDefault || new Date().toISOString().split('T')[0]);
    const [syahadahTempat, setSyahadahTempat] = useState<string>(savedPrefs.tempat || settings.tempatSyahadahDefault || '');
    const [syahadahFormatMode, setSyahadahFormatMode] = useState<DateFormatMode>(savedPrefs.formatMode || settings.formatTanggalSyahadahDefault || 'masehi');
    const [syahadahManualHijri, setSyahadahManualHijri] = useState<string>(savedPrefs.manualHijri || settings.manualHijriSyahadahDefault || '');
    const [isSavingUniversalSyahadah, setIsSavingUniversalSyahadah] = useState<boolean>(false);

    const handleSaveUniversalSyahadahDate = async () => {
        try {
            setIsSavingUniversalSyahadah(true);
            await onUpdateSettings({
                ...settings,
                tanggalSyahadahDefault: syahadahTanggal,
                tempatSyahadahDefault: syahadahTempat.trim(),
                formatTanggalSyahadahDefault: syahadahFormatMode,
                manualHijriSyahadahDefault: syahadahManualHijri.trim()
            });
            showToast('Titimangsa Syahadah (Tanggal, Tempat & Format) berhasil disimpan sebagai default universal!', 'success');
        } catch (err) {
            showToast('Gagal menyimpan default: ' + String(err), 'error');
        } finally {
            setIsSavingUniversalSyahadah(false);
        }
    };

    // Pembimbing / Penandatangan Syahadah State
    type PembimbingSourceType = 'halaqah' | 'walikelas' | 'pengajar' | 'manual';
    const determineInitialPembimbingSource = (): PembimbingSourceType => {
        if (savedPrefs.pembimbingSource) {
            if (savedPrefs.pembimbingSource === 'halaqah' && !halaqahMuhaffizh) {
                if (waliKelasTeacher) return 'walikelas';
                if (settings.tenagaPengajar.length > 0) return 'pengajar';
                return 'manual';
            }
            return savedPrefs.pembimbingSource;
        }
        if (halaqahMuhaffizh) return 'halaqah';
        if (waliKelasTeacher) return 'walikelas';
        if (settings.tenagaPengajar.length > 0) return 'pengajar';
        return 'manual';
    };

    const [pembimbingSource, setPembimbingSource] = useState<PembimbingSourceType>(determineInitialPembimbingSource);
    const [selectedPengajarId, setSelectedPengajarId] = useState<number>(savedPrefs.selectedPengajarId || (settings.tenagaPengajar[0]?.id || 0));
    const [customPembimbingName, setCustomPembimbingName] = useState<string>(savedPrefs.customPembimbingName || '');
    const [pembimbingLabelTop, setPembimbingLabelTop] = useState<string>(savedPrefs.pembimbingLabelTop || 'Muhaffizh / Pembimbing,');
    const [pembimbingRoleBottom, setPembimbingRoleBottom] = useState<string>(savedPrefs.pembimbingRoleBottom || 'Pembimbing Tahfizh');

    // Auto-update default pembimbing source if santri has halaqah
    useEffect(() => {
        if (halaqahMuhaffizh) {
            setPembimbingSource('halaqah');
        } else if (waliKelasTeacher) {
            setPembimbingSource('walikelas');
        } else if (settings.tenagaPengajar.length > 0) {
            setPembimbingSource('pengajar');
        } else {
            setPembimbingSource('manual');
        }
    }, [santri.id, halaqahMuhaffizh, waliKelasTeacher]);

    // Zoom & Scaling state for Syahadah preview
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [zoomLevel, setZoomLevel] = useState<'auto' | '50' | '75' | '100'>('auto');
    const [containerWidth, setContainerWidth] = useState<number>(800);

    // Save preferences on changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                theme: syahadahTheme,
                docTitle: syahadahDocTitle,
                customDocTitle,
                isCustomDocTitle,
                kalimatPengantar,
                customKalimatPengantar,
                isCustomKalimat,
                showWatermarkLogo,
                capaianMode,
                syahadahType,
                juzStart,
                juzEnd,
                customCapaian,
                predikat: syahadahPredikat,
                catatan: syahadahCatatan,
                pembimbingSource,
                selectedPengajarId,
                customPembimbingName,
                pembimbingLabelTop,
                pembimbingRoleBottom,
                tanggal: syahadahTanggal,
                tempat: syahadahTempat,
                formatMode: syahadahFormatMode,
                manualHijri: syahadahManualHijri,
            }));
        } catch (e) {
            // ignore
        }
    }, [
        syahadahTheme, syahadahDocTitle, customDocTitle, isCustomDocTitle,
        kalimatPengantar, customKalimatPengantar, isCustomKalimat, showWatermarkLogo,
        capaianMode, syahadahType, juzStart, juzEnd, customCapaian,
        syahadahPredikat, syahadahCatatan, pembimbingSource, selectedPengajarId,
        customPembimbingName, pembimbingLabelTop, pembimbingRoleBottom,
        syahadahTanggal, syahadahTempat, syahadahFormatMode, syahadahManualHijri
    ]);

    // Track preview container width for responsive Auto Zoom
    useEffect(() => {
        if (!previewContainerRef.current || activeTab !== 'syahadah') return;

        const updateWidth = () => {
            if (previewContainerRef.current) {
                setContainerWidth(previewContainerRef.current.clientWidth);
            }
        };

        updateWidth();

        const observer = new ResizeObserver(() => {
            updateWidth();
        });

        observer.observe(previewContainerRef.current);
        window.addEventListener('resize', updateWidth);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateWidth);
        };
    }, [activeTab]);

    // Calculate Final Capaian Text
    const getFinalCapaianText = (): string => {
        if (capaianMode === 'custom') {
            return customCapaian.trim() || "Khatam Tahfizh Al-Qur'an";
        }
        if (capaianMode === 'rentang') {
            const count = Math.abs(juzEnd - juzStart) + 1;
            const s = Math.min(juzStart, juzEnd);
            const e = Math.max(juzStart, juzEnd);
            return `Khatam ${count} Juz (Juz ${s} s/d Juz ${e})`;
        }
        return syahadahType;
    };

    // Calculate Final Document Title
    const getFinalDocTitle = (): string => {
        if (isCustomDocTitle) {
            return customDocTitle.trim() || "SYAHADAH TAHFIZH AL-QUR'AN";
        }
        return syahadahDocTitle;
    };

    // Calculate Final Kalimat Pengantar di Atas Nama Santri
    const getFinalKalimatPengantar = (): string => {
        if (isCustomKalimat) {
            return customKalimatPengantar.trim() || PRESET_KALIMAT_PENGANTAR[0];
        }
        return kalimatPengantar;
    };

    // Calculate Final Pembimbing Name
    const getFinalPembimbingName = (): string => {
        if (pembimbingSource === 'halaqah') {
            return halaqahMuhaffizh?.nama || 'Ustadz Pembimbing';
        }
        if (pembimbingSource === 'walikelas') {
            return waliKelasTeacher?.nama || 'Wali Kelas';
        }
        if (pembimbingSource === 'pengajar') {
            const teacher = settings.tenagaPengajar.find(t => t.id === selectedPengajarId);
            return teacher?.nama || 'Ustadz Pembimbing';
        }
        if (pembimbingSource === 'manual') {
            return customPembimbingName.trim() || 'Ustadz Pembimbing';
        }
        return 'Ustadz Pembimbing';
    };

    // Calculate zoom scale
    // Original A4 Landscape is ~1122px width x 793px height (29.7cm x 21cm at 96 DPI)
    const BASE_WIDTH = 1122.5;
    const BASE_HEIGHT = 793.7;

    const getScale = (): number => {
        if (zoomLevel === '50') return 0.5;
        if (zoomLevel === '75') return 0.75;
        if (zoomLevel === '100') return 1.0;
        
        // Auto scale with 24px safe padding
        const availableW = Math.max(280, containerWidth - 24);
        return Math.min(1.0, availableW / BASE_WIDTH);
    };

    const currentScale = getScale();

    // Default Date Range: Current Month
    const date = new Date();
    const [startDate, setStartDate] = useState(new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]);

    if (!isOpen) return null;

    const canDelete = currentUser?.role === 'admin' || currentUser?.permissions?.tahfizh === 'write';
    const sortedRecords = [...records].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() || b.id - a.id);

    const handleDelete = (id: number) => {
        showConfirmation(
            'Hapus Catatan?',
            'Data setoran ini akan dihapus permanen.',
            async () => {
                try {
                    await onDeleteTahfizh(id);
                    showToast('Data berhasil dihapus.', 'success');
                } catch (e) {
                    showToast('Gagal menghapus data.', 'error');
                }
            },
            { confirmColor: 'red' }
        );
    };

    const getTypeColor = (tipe: TahfizhRecord['tipe']) => {
        switch (tipe) {
            case 'Ziyadah': return 'bg-green-100 text-green-700 border-green-200';
            case 'Murojaah': return 'bg-blue-100 text-blue-700 border-blue-200';
            case "Tasmi'": return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Ujian Hafalan': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };
    
    const handlePrintLaporan = () => {
        printToPdfNative('tahfizh-report-preview', `Laporan_Tahfizh_${santri.namaLengkap.replace(/\s+/g, '_')}`);
    };

    const handlePrintRapor = () => {
        printToPdfNative('tahfizh-rapor-print-clean', `Rapor_Tahfizh_${raporSemester}_${santri.namaLengkap.replace(/\s+/g, '_')}`, {
            orientation: 'portrait'
        });
    };

    const handlePrintSyahadah = () => {
        const titleClean = getFinalDocTitle().replace(/\s+/g, '_');
        printToPdfNative('tahfizh-syahadah-preview', `${titleClean}_${santri.namaLengkap.replace(/\s+/g, '_')}`, {
            orientation: 'landscape'
        });
    };

    const handleSendWa = (rec: TahfizhRecord) => {
        const phone = santri.teleponWali || santri.telepon;
        if (!phone) {
            showToast('Nomor WhatsApp wali santri belum terdaftar.', 'error');
            return;
        }

        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
        let detailEvaluasi = '';
        if (rec.jumlahTeguran || rec.jumlahKesalahan || rec.rincianKesalahan) {
            detailEvaluasi = `• *Evaluasi*: ${rec.jumlahTeguran || 0}x Teguran, ${rec.jumlahKesalahan || 0}x Kesalahan\n`;
            if (rec.rincianKesalahan) {
                detailEvaluasi += `• *Rincian Koreksi*: ${rec.rincianKesalahan}\n`;
            }
        }

        const pesan = `*LAPORAN MUTABA'AH TAHFIZH SANTRI*\n` +
            `Assalamu'alaikum Wr. Wb.\n\n` +
            `Yth. Wali dari *${santri.namaLengkap}* (NIS: ${santri.nis})\n\n` +
            `Berikut rincian setoran hafalan ananda:\n` +
            `• *Tanggal*: ${rec.tanggal}\n` +
            `• *Jenis*: ${rec.tipe}\n` +
            `• *Capaian*: Juz ${rec.juz}, QS. ${rec.surah} (Ayat ${rec.ayatAwal} - ${rec.ayatAkhir})\n` +
            `• *Predikat*: ${rec.predikat}\n` +
            detailEvaluasi +
            (rec.catatan ? `• *Catatan Pembimbing*: ${rec.catatan}\n\n` : `\n`) +
            `Semoga Allah mempermudah hafalan dan pemahaman Al-Qur'an ananda.\n\n` +
            `_${settings.namaPonpes}_`;

        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`, '_blank');
    };

    const handleOpenMunaqosyahForJuz = (juz: number) => {
        setSelectedExamJuz(juz);
        setIsMunaqosyahModalOpen(true);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-4xl h-[94vh] sm:h-[90vh] flex flex-col animate-slide-up sm:animate-none relative overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            {santri.namaLengkap.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-base">{santri.namaLengkap}</h3>
                            <p className="text-xs text-gray-500">
                                NIS: {santri.nis} • Target: <span className="font-semibold text-teal-700">{santri.targetJuz || 30} Juz</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Instant WhatsApp Share Button */}
                        <button
                            type="button"
                            onClick={() => setIsWaModalOpen(true)}
                            className="text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-200 flex items-center gap-1.5 transition-colors shadow-xs"
                            title="Format Laporan & Kirim ke WhatsApp Wali Santri"
                        >
                            <i className="bi bi-whatsapp text-emerald-700"></i>
                            <span className="hidden sm:inline">Kirim WA Wali</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowPrintConfig(!showPrintConfig)}
                            className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-100 flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                            <i className="bi bi-printer"></i>
                            <span className="hidden sm:inline">Cetak Dokumen</span>
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Tabs (5 Core Features) */}
                <div className="flex border-b border-gray-200 bg-white px-4 shrink-0 text-xs sm:text-sm overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'timeline' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className="bi bi-clock-history"></i>
                        <span>Riwayat Setoran ({records.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('grid')}
                        className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'grid' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className="bi bi-grid-3x3-gap-fill"></i>
                        <span>Peta 30 Juz & Radar</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('munaqosyah')}
                        className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'munaqosyah' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className="bi bi-patch-check-fill text-teal-600"></i>
                        <span>Ujian Munaqosyah</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('rapor')}
                        className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'rapor' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className="bi bi-journal-text text-emerald-600"></i>
                        <span>Rapor Semester</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('syahadah')}
                        className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'syahadah' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className="bi bi-award-fill text-amber-500"></i>
                        <span>Syahadah & Piagam</span>
                    </button>
                </div>

                {/* Print Configuration Panel */}
                {showPrintConfig && (
                    <div className="p-4 bg-gray-50 border-b animate-fade-in-down shrink-0 space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-gray-600 tracking-wider">Cetak Dokumen Tahfizh</h4>
                            <span className="text-[11px] text-gray-500">Pilih rentang atau format cetak</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dari Tanggal</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sampai Tanggal</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={handlePrintLaporan}
                                className="bg-teal-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <i className="bi bi-file-earmark-pdf-fill"></i> PDF Rekap Mutaba'ah
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintRapor}
                                className="bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-800 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <i className="bi bi-journal-check"></i> PDF Rapor Semester
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintSyahadah}
                                className="bg-amber-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-amber-700 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <i className="bi bi-award-fill"></i> PDF Syahadah
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal Body */}
                <div className="flex-grow overflow-y-auto p-3 sm:p-5 bg-gray-50/50 space-y-4">
                    {/* TAB 1: TIMELINE */}
                    {activeTab === 'timeline' && (
                        <div>
                            {sortedRecords.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <i className="bi bi-journal-x text-4xl mb-2 opacity-50"></i>
                                    <p className="text-sm">Belum ada riwayat setoran.</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-gray-200 ml-3 space-y-4 pl-6 py-2">
                                    {sortedRecords.map((rec) => (
                                        <div key={rec.id} className="relative group">
                                            {/* Dot */}
                                            <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                                rec.tipe === 'Ziyadah'
                                                    ? 'bg-green-500'
                                                    : rec.tipe === 'Murojaah'
                                                        ? 'bg-blue-500'
                                                        : rec.tipe === 'Ujian Hafalan'
                                                            ? 'bg-amber-500'
                                                            : 'bg-purple-500'
                                            }`}></div>
                                            
                                            {/* Card */}
                                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeColor(rec.tipe)}`}>
                                                            {rec.tipe}
                                                        </span>
                                                        {rec.sesiUjian && (
                                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                                {rec.sesiUjian}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-gray-500 flex items-center">
                                                            <i className="bi bi-calendar-event mr-1"></i>
                                                            {new Date(rec.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendWa(rec)}
                                                            className="p-1 px-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                                                            title="Kirim ke WhatsApp Wali"
                                                        >
                                                            <i className="bi bi-whatsapp"></i>
                                                            <span className="hidden sm:inline">WA</span>
                                                        </button>
                                                        {canDelete && (
                                                            <button onClick={() => handleDelete(rec.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-2">
                                                    <p className="font-bold text-gray-800 text-sm">
                                                        Juz {rec.juz} • QS. {rec.surah}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        Ayat {rec.ayatAwal} - {rec.ayatAkhir}
                                                    </p>
                                                </div>

                                                {/* Evaluasi Teguran & Kesalahan Details */}
                                                {(Boolean(rec.jumlahTeguran) || Boolean(rec.jumlahKesalahan) || Boolean(rec.rincianKesalahan)) && (
                                                    <div className="mb-2.5 p-2 bg-amber-50/60 border border-amber-200/70 rounded-lg text-xs space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {typeof rec.jumlahTeguran === 'number' && rec.jumlahTeguran > 0 && (
                                                                <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded text-[11px] border border-amber-300">
                                                                    ⚠️ {rec.jumlahTeguran} Teguran (Tawaqquf)
                                                                </span>
                                                            )}
                                                            {typeof rec.jumlahKesalahan === 'number' && rec.jumlahKesalahan > 0 && (
                                                                <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded text-[11px] border border-rose-300">
                                                                    ❌ {rec.jumlahKesalahan} Kesalahan
                                                                </span>
                                                            )}
                                                            {rec.kategoriKesalahan && (
                                                                <div className="flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                                                                    {Boolean(rec.kategoriKesalahan.tajwid) && <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded">Tajwid: {rec.kategoriKesalahan.tajwid}</span>}
                                                                    {Boolean(rec.kategoriKesalahan.makhraj) && <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded">Makhraj: {rec.kategoriKesalahan.makhraj}</span>}
                                                                    {Boolean(rec.kategoriKesalahan.kelancaran) && <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded">Tawaqquf: {rec.kategoriKesalahan.kelancaran}</span>}
                                                                    {Boolean(rec.kategoriKesalahan.terlewat) && <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded">Tertukar: {rec.kategoriKesalahan.terlewat}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {rec.rincianKesalahan && (
                                                            <p className="text-[11px] text-amber-950/80 font-medium">
                                                                <span className="font-bold text-amber-900">Rincian Koreksi:</span> {rec.rincianKesalahan}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-1">
                                                        <i className="bi bi-bookmark-star-fill text-amber-500 text-xs"></i>
                                                        <span className="text-xs font-semibold text-gray-700">{rec.predikat}</span>
                                                    </div>
                                                    {rec.catatan && (
                                                        <div className="text-xs text-gray-500 italic max-w-[60%] truncate" title={rec.catatan}>
                                                            "{rec.catatan}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: 30 JUZ PROGRESS GRID & RADAR */}
                    {activeTab === 'grid' && (
                        <div className="space-y-4">
                            <TahfizhMushafGrid 
                                records={records} 
                                targetJuz={santri.targetJuz || 30}
                                onOpenMunaqosyah={handleOpenMunaqosyahForJuz}
                            />
                        </div>
                    )}

                    {/* TAB 3: UJIAN MUNAQOSYAH & TASMI' */}
                    {activeTab === 'munaqosyah' && (
                        <div className="space-y-4">
                            {/* Action Hero */}
                            <div className="bg-gradient-to-r from-teal-800 to-emerald-800 p-4 sm:p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="p-1.5 bg-teal-600/60 rounded-lg text-teal-200">
                                            <i className="bi bi-patch-check-fill text-lg"></i>
                                        </span>
                                        <h4 className="font-bold text-base">Ujian Munaqosyah & Tasmi' Hafalan</h4>
                                    </div>
                                    <p className="text-xs text-teal-100 max-w-xl">
                                        Lembar penilaian terstandar (Itqan 40%, Tajwid 30%, Fashahah 20%, Adab 10%) dengan kalkulasi skor otomatis dan cetak Berita Acara resmi.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleOpenMunaqosyahForJuz(30)}
                                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <i className="bi bi-plus-circle-fill text-sm"></i>
                                    Mulai Ujian Munaqosyah Baru
                                </button>
                            </div>

                            {/* Riwayat Ujian Munaqosyah */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                                <h5 className="font-bold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <i className="bi bi-award text-amber-600"></i>
                                    Riwayat Ujian & Predikat Kelulusan Juz
                                </h5>

                                {records.filter(r => r.tipe === 'Ujian Hafalan').length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <i className="bi bi-patch-question text-3xl text-gray-400 block mb-2"></i>
                                        <p className="text-xs font-bold text-gray-700">Belum Ada Catatan Ujian Munaqosyah</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Klik tombol "Mulai Ujian Munaqosyah Baru" di atas untuk menilai hafalan santri secara resmi.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {records
                                            .filter(r => r.tipe === 'Ujian Hafalan')
                                            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                                            .map((exam) => (
                                                <div key={exam.id || exam.tanggal} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-400 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 font-black text-sm flex items-center justify-center shrink-0 border border-teal-200">
                                                            Juz {exam.juz}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-xs text-gray-900">
                                                                    {exam.sesiUjian || 'Ujian Munaqosyah'} • QS. {exam.surah}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                    exam.predikat === 'Sangat Lancar' ? 'bg-emerald-100 text-emerald-800' :
                                                                    exam.predikat === 'Lancar' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                    {exam.predikat}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                                Tanggal: {exam.tanggal} • Nilai: <strong className="text-teal-900">{exam.nilaiAngka || '-'}/100</strong>
                                                            </p>
                                                            {exam.catatan && (
                                                                <p className="text-[11px] text-gray-600 italic mt-1 bg-white p-1.5 rounded-md border border-gray-200">
                                                                    "{exam.catatan}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenMunaqosyahForJuz(exam.juz)}
                                                            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-teal-700 border border-teal-300 rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            Uji Ulang
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: RAPOR SEMESTER TAHFIZH */}
                    {activeTab === 'rapor' && (
                        <div className="space-y-4">
                            {/* Controls Card */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <div>
                                        <h4 className="text-xs font-extrabold uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                                            <i className="bi bi-journal-text text-teal-600"></i>
                                            Pengaturan Rapor Semester Tahfizh
                                        </h4>
                                        <p className="text-[11px] text-gray-500">Format resmi A4 portrait dilengkapi peta 30 juz, skor kompetensi, dan tanda tangan 3 pihak.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handlePrintRapor}
                                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                    >
                                        <i className="bi bi-printer"></i> Cetak PDF Rapor
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Semester:</label>
                                        <select
                                            value={raporSemester}
                                            onChange={(e) => setRaporSemester(e.target.value as 'Ganjil' | 'Genap')}
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                                        >
                                            <option value="Ganjil">Semester Ganjil</option>
                                            <option value="Genap">Semester Genap</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Tahun Ajaran:</label>
                                        <input
                                            type="text"
                                            value={raporTahunAjaran}
                                            onChange={(e) => setRaporTahunAjaran(e.target.value)}
                                            placeholder="2026/2027"
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                                        />
                                    </div>
                                </div>

                                {/* Titimangsa Rapor (Tanggal & Tempat Diresmikan / Dikeluarkan) */}
                                <div className="p-3 bg-gradient-to-r from-teal-50/70 to-emerald-50/50 rounded-xl border border-teal-200/70 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="text-[11px] font-bold text-teal-900 uppercase flex items-center gap-1.5">
                                            <i className="bi bi-calendar-check text-teal-600"></i>
                                            Titimangsa Rapor (Tempat, Tanggal & Opsi Hijriah)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleSaveUniversalRaporDate}
                                            disabled={isSavingUniversalRapor}
                                            className="text-[10px] bg-teal-600 hover:bg-teal-700 text-white font-bold px-2.5 py-1 rounded-lg transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
                                            title="Simpan tempat, tanggal & format ini agar otomatis berlaku universal bagi seluruh santri"
                                        >
                                            {isSavingUniversalRapor ? <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></span> : <i className="bi bi-floppy"></i>}
                                            <span>Jadikan Default Universal</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Tempat / Kota</label>
                                            <input
                                                type="text"
                                                value={raporTempat}
                                                onChange={(e) => setRaporTempat(e.target.value)}
                                                placeholder={settings.tempatRaporDefault || "Contoh: Banyumas"}
                                                className="w-full p-2 bg-white border border-teal-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Tanggal Diresmikan</label>
                                            <input
                                                type="date"
                                                value={raporTanggal}
                                                onChange={(e) => setRaporTanggal(e.target.value)}
                                                className="w-full p-2 bg-white border border-teal-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Format Tanggal</label>
                                            <select
                                                value={raporFormatMode}
                                                onChange={(e) => setRaporFormatMode(e.target.value as DateFormatMode)}
                                                className="w-full p-2 bg-white border border-teal-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-teal-500"
                                            >
                                                <option value="masehi">📅 Masehi Saja</option>
                                                <option value="hijriah_masehi">🌙 Masehi & Hijriah (Gabungan)</option>
                                                <option value="hijriah">🕌 Hijriah Saja</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Preview & Manual Hijri Input */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-teal-200/50">
                                        <div className="text-[11px] text-teal-900 flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-semibold text-gray-500 uppercase">Tampilan:</span>
                                            <span className="font-bold bg-white/80 px-2 py-0.5 rounded border border-teal-200 text-teal-800">
                                                {raporTempat || settings.tempatRaporDefault || 'Pondok'}, {formatTanggalDokumen(raporTanggal, {
                                                    formatMode: raporFormatMode,
                                                    hijriAdjustment: settings.hijriAdjustment || 0,
                                                    manualHijri: raporManualHijri
                                                })}
                                            </span>
                                        </div>
                                        {raporFormatMode !== 'masehi' && (
                                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                                <span className="text-[10px] text-gray-500 whitespace-nowrap">Teks Hijriah Manual:</span>
                                                <input
                                                    type="text"
                                                    value={raporManualHijri}
                                                    onChange={(e) => setRaporManualHijri(e.target.value)}
                                                    placeholder="Otomatis (atau ketik manual)"
                                                    className="p-1 px-2 bg-white border border-teal-200 rounded text-xs text-gray-800 w-full sm:w-48 placeholder:text-gray-400"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Opsi Tampilan Peta Hafalan di Rapor (Grid 30 Juz vs Per Surat / Rentang Juz) */}
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-800 uppercase flex items-center gap-1.5">
                                                <i className="bi bi-grid-3x3 text-teal-600"></i>
                                                Tampilan Peta Hafalan di Lembar Rapor:
                                            </label>
                                            <p className="text-[10px] text-gray-500">Pilih format visualisasi hafalan yang dicetak pada halaman rapor santri.</p>
                                        </div>
                                        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs shadow-2xs">
                                            <button
                                                type="button"
                                                onClick={() => setRaporPetaMode('grid30')}
                                                className={`px-3 py-1 rounded-md font-bold transition-all ${
                                                    raporPetaMode === 'grid30'
                                                        ? 'bg-teal-700 text-white shadow-xs'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                Peta 30 Juz Al-Qur'an
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRaporPetaMode('perSurah')}
                                                className={`px-3 py-1 rounded-md font-bold transition-all ${
                                                    raporPetaMode === 'perSurah'
                                                        ? 'bg-teal-700 text-white shadow-xs'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                Per Surat (Ibtidaiyah / Rentang Juz)
                                            </button>
                                        </div>
                                    </div>

                                    {raporPetaMode === 'perSurah' && (
                                        <div className="pt-2.5 border-t border-gray-200 space-y-2">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-teal-900">
                                                        🎯 Model Pilihan Juz:
                                                    </span>
                                                    <div className="inline-flex rounded-md border border-teal-300 bg-white p-0.5 text-[11px]">
                                                        <button
                                                            type="button"
                                                            onClick={() => setRaporPetaRentangType('single')}
                                                            className={`px-2 py-0.5 rounded font-bold transition-all ${
                                                                raporPetaRentangType === 'single'
                                                                    ? 'bg-teal-700 text-white'
                                                                    : 'text-teal-900 hover:bg-teal-50'
                                                            }`}
                                                        >
                                                            1 Juz Saja
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRaporPetaRentangType('range')}
                                                            className={`px-2 py-0.5 rounded font-bold transition-all ${
                                                                raporPetaRentangType === 'range'
                                                                    ? 'bg-teal-700 text-white'
                                                                    : 'text-teal-900 hover:bg-teal-50'
                                                            }`}
                                                        >
                                                            Rentang Juz (Misal Juz 30 - 29)
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Selector */}
                                                {raporPetaRentangType === 'single' ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <label className="text-xs font-bold text-teal-950 shrink-0">Pilih Juz:</label>
                                                        <select
                                                            value={raporPetaJuzStart}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                setRaporPetaJuzStart(val);
                                                                setRaporPetaJuzEnd(val);
                                                            }}
                                                            className="p-1.5 bg-white border border-teal-400 rounded-lg text-xs font-bold text-teal-950"
                                                        >
                                                            {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                                                <option key={j} value={j}>
                                                                    Juz {j} {j === 30 ? "(Juz 'Amma - 37 Surat)" : j === 29 ? "(Tabarak - 11 Surat)" : j === 1 ? "(Al-Fatihah & Al-Baqarah)" : ""}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <label className="text-xs font-bold text-teal-950 shrink-0">Dari:</label>
                                                        <select
                                                            value={raporPetaJuzStart}
                                                            onChange={(e) => setRaporPetaJuzStart(Number(e.target.value))}
                                                            className="p-1.5 bg-white border border-teal-400 rounded-lg text-xs font-bold text-teal-950"
                                                        >
                                                            {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                                                <option key={j} value={j}>Juz {j}</option>
                                                            ))}
                                                        </select>
                                                        <span className="text-xs font-bold text-teal-900">s/d</span>
                                                        <select
                                                            value={raporPetaJuzEnd}
                                                            onChange={(e) => setRaporPetaJuzEnd(Number(e.target.value))}
                                                            className="p-1.5 bg-white border border-teal-400 rounded-lg text-xs font-bold text-teal-950"
                                                        >
                                                            {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                                                <option key={j} value={j}>Juz {j}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quick shortcuts */}
                                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                                <span className="text-gray-500 font-semibold mr-1">Pilihan Cepat:</span>
                                                {raporPetaRentangType === 'single' ? (
                                                    [30, 29, 28, 1, 2].map(j => (
                                                        <button
                                                            key={j}
                                                            type="button"
                                                            onClick={() => {
                                                                setRaporPetaJuzStart(j);
                                                                setRaporPetaJuzEnd(j);
                                                            }}
                                                            className={`px-2 py-0.5 rounded font-bold border transition-all ${
                                                                raporPetaJuzStart === j && raporPetaJuzEnd === j
                                                                    ? 'bg-teal-700 text-white border-teal-800'
                                                                    : 'bg-white text-teal-900 border-gray-300 hover:bg-teal-50'
                                                            }`}
                                                        >
                                                            Juz {j}
                                                        </button>
                                                    ))
                                                ) : (
                                                    [
                                                        { s: 30, e: 29, label: "Juz 30 - 29 (2 Juz)" },
                                                        { s: 30, e: 28, label: "Juz 30 - 28 (3 Juz)" },
                                                        { s: 1, e: 2, label: "Juz 1 - 2 (2 Juz)" },
                                                        { s: 1, e: 3, label: "Juz 1 - 3 (3 Juz)" },
                                                        { s: 1, e: 5, label: "Juz 1 - 5 (5 Juz)" },
                                                    ].map(r => {
                                                        const isMatch = (raporPetaJuzStart === r.s && raporPetaJuzEnd === r.e) || (raporPetaJuzStart === r.e && raporPetaJuzEnd === r.s);
                                                        return (
                                                            <button
                                                                key={r.label}
                                                                type="button"
                                                                onClick={() => {
                                                                    setRaporPetaJuzStart(r.s);
                                                                    setRaporPetaJuzEnd(r.e);
                                                                }}
                                                                className={`px-2 py-0.5 rounded font-bold border transition-all ${
                                                                    isMatch
                                                                        ? 'bg-teal-700 text-white border-teal-800'
                                                                        : 'bg-white text-teal-900 border-gray-300 hover:bg-teal-50'
                                                                }`}
                                                            >
                                                                {r.label}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
                                    <div className="flex flex-wrap justify-between items-center gap-1.5">
                                        <label className="block text-[11px] font-bold text-gray-800 uppercase">
                                            Catatan & Evaluasi Pembimbing Halaqah:
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-gray-500 font-medium">
                                                {raporCatatan.length} karakter (maks. 2 baris tercetak)
                                            </span>
                                            {raporCatatan && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporCatatan('')}
                                                    className="text-[10px] text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 font-semibold"
                                                >
                                                    Hapus
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Preset Buttons */}
                                    <div>
                                        <div className="text-[10px] font-semibold text-teal-800 mb-1 flex items-center gap-1">
                                            <i className="bi bi-stars text-teal-600"></i>
                                            Pilih Preset Catatan Pembimbing:
                                        </div>
                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                            {TAHFIZH_CATATAN_PRESETS.map((preset) => {
                                                const isSelected = raporCatatan === preset.text;
                                                return (
                                                    <button
                                                        key={preset.id}
                                                        type="button"
                                                        onClick={() => setRaporCatatan(preset.text)}
                                                        className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-all text-left ${
                                                            isSelected
                                                                ? 'bg-teal-700 text-white border-teal-800 shadow-2xs font-bold'
                                                                : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400 hover:bg-teal-50/50'
                                                        }`}
                                                        title={preset.text}
                                                    >
                                                        <span className="opacity-75 font-semibold">[{preset.kategori}]</span> {preset.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Manual Textarea */}
                                    <div>
                                        <div className="text-[10px] font-semibold text-gray-600 mb-1 flex items-center justify-between">
                                            <span>Kustomisasi Manual:</span>
                                            <span className="text-[9.5px] text-gray-400 italic">Dapat diedit langsung sesuai kebutuhan santri</span>
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={raporCatatan}
                                            onChange={(e) => setRaporCatatan(e.target.value)}
                                            placeholder="Tuliskan catatan motivasi, kelancaran tajwid, atau evaluasi pembimbing tahfizh..."
                                            className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                        ></textarea>
                                    </div>
                                </div>

                                {/* Flexible Signers Configuration (3 Pihak: Orang Tua, Muhaffizh, Mudir) */}
                                <div className="p-3.5 bg-gradient-to-r from-teal-50/70 to-emerald-50/70 border border-teal-200 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                                            <i className="bi bi-pen-fill text-teal-600"></i>
                                            Pengaturan Penanda Tangan Rapor (3 Kolom Sejajar):
                                        </div>
                                        <span className="text-[10px] text-teal-700 font-semibold bg-white/80 px-2 py-0.5 rounded border border-teal-200">
                                            Auto / Manual / Titik-titik
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* 1. Orang Tua / Wali */}
                                        <div className="bg-white p-2.5 rounded-xl border border-teal-100 shadow-2xs space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-bold text-gray-900 block">1. Orang Tua / Wali</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">Kiri</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-1 text-[10px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporOrangTuaMode('auto')}
                                                    className={`py-1 px-1 rounded font-bold border text-center transition-all ${
                                                        raporOrangTuaMode === 'auto' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Otomatis
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporOrangTuaMode('manual')}
                                                    className={`py-1 px-1 rounded font-bold border text-center transition-all ${
                                                        raporOrangTuaMode === 'manual' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Manual
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporOrangTuaMode('dots')}
                                                    className={`py-1 px-1 rounded font-bold border text-center transition-all ${
                                                        raporOrangTuaMode === 'dots' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Titik-titik
                                                </button>
                                            </div>

                                            {raporOrangTuaMode === 'auto' && (
                                                <div className="text-[10px] bg-teal-50/70 p-1.5 rounded border border-teal-100 text-teal-950">
                                                    <span className="text-gray-500 block text-[9px]">Nama di Database:</span>
                                                    <span className="font-bold">{santri.namaWali || santri.namaAyah || santri.namaIbu || '(Kosong di database santri)'}</span>
                                                </div>
                                            )}

                                            {raporOrangTuaMode === 'manual' && (
                                                <div className="space-y-1.5 pt-1">
                                                    <input
                                                        type="text"
                                                        value={raporCustomOrangTuaName}
                                                        onChange={(e) => setRaporCustomOrangTuaName(e.target.value)}
                                                        placeholder="Nama Orang Tua / Wali..."
                                                        className="w-full p-1.5 text-[11px] font-semibold border border-gray-300 rounded bg-white"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={raporCustomOrangTuaLabel}
                                                        onChange={(e) => setRaporCustomOrangTuaLabel(e.target.value)}
                                                        placeholder="Label (Wali Santri / Ayah)..."
                                                        className="w-full p-1.5 text-[10px] border border-gray-300 rounded bg-white text-gray-600"
                                                    />
                                                </div>
                                            )}

                                            {raporOrangTuaMode === 'dots' && (
                                                <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                                                    <i className="bi bi-info-circle mr-1"></i>
                                                    Dicetak titik-titik <span className="font-mono font-bold">...................</span> untuk tanda tangan & tulis manual setelah cetak.
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. Pembimbing / Muhaffizh */}
                                        <div className="bg-white p-2.5 rounded-xl border border-teal-100 shadow-2xs space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-bold text-gray-900 block">2. Pembimbing / Muhaffizh</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">Tengah (Mengetahui)</span>
                                            </div>

                                            <div className="grid grid-cols-4 gap-0.5 text-[9.5px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporMuhaffizhMode('auto')}
                                                    className={`py-1 px-0.5 rounded font-bold border text-center transition-all ${
                                                        raporMuhaffizhMode === 'auto' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Otomatis
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporMuhaffizhMode('select')}
                                                    className={`py-1 px-0.5 rounded font-bold border text-center transition-all ${
                                                        raporMuhaffizhMode === 'select' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Pilih
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporMuhaffizhMode('manual')}
                                                    className={`py-1 px-0.5 rounded font-bold border text-center transition-all ${
                                                        raporMuhaffizhMode === 'manual' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Manual
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporMuhaffizhMode('dots')}
                                                    className={`py-1 px-0.5 rounded font-bold border text-center transition-all ${
                                                        raporMuhaffizhMode === 'dots' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Titik-titik
                                                </button>
                                            </div>

                                            {raporMuhaffizhMode === 'auto' && (
                                                <div className="text-[10px] bg-teal-50/70 p-1.5 rounded border border-teal-100 text-teal-950">
                                                    <span className="text-gray-500 block text-[9px]">Sesuai Halaqah / Kelas:</span>
                                                    <span className="font-bold">{getFinalPembimbingName()}</span>
                                                </div>
                                            )}

                                            {raporMuhaffizhMode === 'select' && (
                                                <div className="pt-1">
                                                    <select
                                                        value={raporSelectedMuhaffizhId}
                                                        onChange={(e) => setRaporSelectedMuhaffizhId(Number(e.target.value))}
                                                        className="w-full p-1.5 text-[11px] font-semibold border border-teal-400 rounded bg-white"
                                                    >
                                                        <option value={0}>-- Pilih Tenaga Pengajar / Ustadz --</option>
                                                        {settings.tenagaPengajar.map(t => (
                                                            <option key={t.id} value={t.id}>{t.nama}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {raporMuhaffizhMode === 'manual' && (
                                                <div className="space-y-1.5 pt-1">
                                                    <input
                                                        type="text"
                                                        value={raporCustomMuhaffizhName}
                                                        onChange={(e) => setRaporCustomMuhaffizhName(e.target.value)}
                                                        placeholder="Nama Ustadz Muhaffizh..."
                                                        className="w-full p-1.5 text-[11px] font-semibold border border-gray-300 rounded bg-white"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={raporCustomMuhaffizhLabel}
                                                        onChange={(e) => setRaporCustomMuhaffizhLabel(e.target.value)}
                                                        placeholder="Jabatan / Label Halaqah..."
                                                        className="w-full p-1.5 text-[10px] border border-gray-300 rounded bg-white text-gray-600"
                                                    />
                                                </div>
                                            )}

                                            {raporMuhaffizhMode === 'dots' && (
                                                <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                                                    <i className="bi bi-info-circle mr-1"></i>
                                                    Dicetak titik-titik <span className="font-mono font-bold">...................</span> untuk tanda tangan muhaffizh manual.
                                                </div>
                                            )}
                                        </div>

                                        {/* 3. Mudir / Pimpinan Pondok */}
                                        <div className="bg-white p-2.5 rounded-xl border border-teal-100 shadow-2xs space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-bold text-gray-900 block">3. Mudir / Pimpinan Pondok</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">Kanan</span>
                                            </div>

                                            <div className="grid grid-cols-4 gap-0.5 text-[9.5px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporMudirMode('auto')}
                                                    className={`py-1 px-0.5 rounded font-bold border text-center transition-all ${
                                                        raporMudirMode === 'auto' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Otomatis
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporMudirMode('select')}
                                                    className={`py-1 px-0.5 rounded font-bold border text-center transition-all ${
                                                        raporMudirMode === 'select' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Pilih
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporMudirMode('manual')}
                                                    className={`py-1 px-0.5 rounded font-bold border text-center transition-all ${
                                                        raporMudirMode === 'manual' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Manual
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRaporMudirMode('dots')}
                                                    className={`py-1 px-0.5 rounded font-bold border text-center transition-all ${
                                                        raporMudirMode === 'dots' ? 'bg-teal-700 text-white border-teal-800' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                                >
                                                    Titik-titik
                                                </button>
                                            </div>

                                            {raporMudirMode === 'auto' && (
                                                <div className="text-[10px] bg-teal-50/70 p-1.5 rounded border border-teal-100 text-teal-950">
                                                    <span className="text-gray-500 block text-[9px]">Sesuai Pengaturan Pondok:</span>
                                                    <span className="font-bold">
                                                        {settings.mudirAamId 
                                                            ? settings.tenagaPengajar.find(t => t.id === settings.mudirAamId)?.nama 
                                                            : (settings.tenagaPengajar[0]?.nama || settings.namaPonpes || 'Pimpinan Pondok')}
                                                    </span>
                                                </div>
                                            )}

                                            {raporMudirMode === 'select' && (
                                                <div className="pt-1">
                                                    <select
                                                        value={raporSelectedMudirId}
                                                        onChange={(e) => setRaporSelectedMudirId(Number(e.target.value))}
                                                        className="w-full p-1.5 text-[11px] font-semibold border border-teal-400 rounded bg-white"
                                                    >
                                                        <option value={0}>-- Pilih Pimpinan / Mudir --</option>
                                                        {settings.tenagaPengajar.map(t => (
                                                            <option key={t.id} value={t.id}>{t.nama}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {raporMudirMode === 'manual' && (
                                                <div className="space-y-1.5 pt-1">
                                                    <input
                                                        type="text"
                                                        value={raporCustomMudirName}
                                                        onChange={(e) => setRaporCustomMudirName(e.target.value)}
                                                        placeholder="Nama Mudir / Pengasuh..."
                                                        className="w-full p-1.5 text-[11px] font-semibold border border-gray-300 rounded bg-white"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={raporCustomMudirJabatan}
                                                        onChange={(e) => setRaporCustomMudirJabatan(e.target.value)}
                                                        placeholder="Jabatan (Mudir / Pengasuh)..."
                                                        className="w-full p-1.5 text-[10px] border border-gray-300 rounded bg-white text-gray-600"
                                                    />
                                                </div>
                                            )}

                                            {raporMudirMode === 'dots' && (
                                                <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                                                    <i className="bi bi-info-circle mr-1"></i>
                                                    Dicetak titik-titik <span className="font-mono font-bold">...................</span> untuk tanda tangan mudir manual.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview of Rapor */}
                            <div className="bg-slate-800 p-4 rounded-2xl shadow-inner flex flex-col items-center">
                                <div className="w-full flex justify-between items-center text-slate-300 text-xs mb-3 pb-2 border-b border-slate-700">
                                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                        <i className="bi bi-eye-fill"></i> Pratinjau Dokumen Rapor Tahfizh (A4):
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handlePrintRapor}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors"
                                    >
                                        <i className="bi bi-printer mr-1"></i> Cetak / Simpan PDF
                                    </button>
                                </div>
                                <div className="w-full overflow-x-auto flex justify-center pb-2">
                                    <div id="tahfizh-rapor-preview-screen" className="shadow-2xl scale-90 sm:scale-100 origin-top bg-white print-portrait">
                                        <TahfizhSemesterRaporTemplate
                                            santri={santri}
                                            records={records}
                                            settings={{
                                                ...settings,
                                                tanggalRaporDefault: raporTanggal || settings.tanggalRaporDefault,
                                                tempatRaporDefault: raporTempat.trim() || settings.tempatRaporDefault
                                            }}
                                            semester={raporSemester}
                                            tahunAjaran={raporTahunAjaran}
                                            tanggalRapor={raporTanggal}
                                            targetJuz={santri.targetJuz || 30}
                                            catatanMuhaffizh={raporCatatan}
                                            
                                            orangTuaMode={raporOrangTuaMode}
                                            orangTuaName={raporOrangTuaMode === 'manual' ? raporCustomOrangTuaName : undefined}
                                            orangTuaLabel={raporOrangTuaMode === 'manual' ? raporCustomOrangTuaLabel : undefined}
                                            
                                            muhaffizhMode={raporMuhaffizhMode === 'select' ? 'manual' : raporMuhaffizhMode}
                                            muhaffizhName={
                                                raporMuhaffizhMode === 'select' 
                                                    ? settings.tenagaPengajar.find(t => t.id === raporSelectedMuhaffizhId)?.nama 
                                                    : raporMuhaffizhMode === 'manual' 
                                                        ? raporCustomMuhaffizhName 
                                                        : undefined
                                            }
                                            muhaffizhLabel={raporMuhaffizhMode === 'manual' ? raporCustomMuhaffizhLabel : undefined}
                                            
                                            mudirMode={raporMudirMode === 'select' ? 'manual' : raporMudirMode}
                                            mudirName={
                                                raporMudirMode === 'select'
                                                    ? settings.tenagaPengajar.find(t => t.id === raporSelectedMudirId)?.nama
                                                    : raporMudirMode === 'manual'
                                                        ? raporCustomMudirName
                                                        : undefined
                                            }
                                            mudirJabatan={raporMudirMode === 'manual' ? raporCustomMudirJabatan : undefined}
                                            
                                            petaMode={raporPetaMode}
                                            petaJuzStart={raporPetaRentangType === 'range' ? Math.min(raporPetaJuzStart, raporPetaJuzEnd) : raporPetaJuzStart}
                                            petaJuzEnd={raporPetaRentangType === 'range' ? Math.max(raporPetaJuzStart, raporPetaJuzEnd) : raporPetaJuzStart}
                                            petaJuzTarget={raporPetaJuzStart}
                                            formatMode={raporFormatMode}
                                            manualHijri={raporManualHijri}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: SYAHADAH / PIAGAM PREVIEW & PRINT */}
                    {activeTab === 'syahadah' && (
                        <div className="space-y-4">
                            {/* Controls Card */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                                    <div>
                                        <h4 className="text-xs font-extrabold uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                                            <i className="bi bi-palette-fill text-teal-600"></i>
                                            Pengaturan Syahadah & Piagam
                                        </h4>
                                        <p className="text-[11px] text-gray-500">Pilih dari 5 tema, kustomisasi judul & rentang juz sesuai kebutuhan.</p>
                                    </div>
                                    <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full font-bold">
                                        Auto-Save Aktif
                                    </span>
                                </div>

                                {/* 1. Theme Selector (5 Themes from Kartu Santri) */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-2">
                                        Pilih 5 Desain Tema Syahadah:
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                        {[
                                            { id: 'classic' as SyahadahTheme, name: '1. Klasik Emas', desc: 'Hijau Emerald & Gold', bg: 'bg-emerald-800 text-amber-300 border-amber-400' },
                                            { id: 'modern' as SyahadahTheme, name: '2. Modern Tech', desc: 'Royal Blue & Silver', bg: 'bg-blue-900 text-white border-blue-400' },
                                            { id: 'vertical' as SyahadahTheme, name: '3. Merah Emas', desc: 'Marun Nusantara', bg: 'bg-rose-900 text-amber-200 border-amber-400' },
                                            { id: 'dark' as SyahadahTheme, name: '4. Dark Luxury', desc: 'Slate & Glow Gold', bg: 'bg-slate-950 text-amber-300 border-amber-500' },
                                            { id: 'ceria' as SyahadahTheme, name: '5. Ceria / TPQ', desc: 'Amber & Tosca Fresh', bg: 'bg-amber-500 text-white border-teal-400' },
                                        ].map((t) => {
                                            const isActive = syahadahTheme === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setSyahadahTheme(t.id)}
                                                    className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                                                        isActive
                                                            ? 'ring-2 ring-teal-600 shadow-md border-teal-600 bg-teal-50/50'
                                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-bold text-gray-800">{t.name}</span>
                                                        <div className={`w-3.5 h-3.5 rounded-full border ${t.bg} shrink-0`}></div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 leading-tight">{t.desc}</span>
                                                    {isActive && (
                                                        <span className="absolute top-1 right-1 text-teal-600 text-[10px]">
                                                            <i className="bi bi-check-circle-fill"></i>
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. Document Title & Nomenclature */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[11px] font-bold text-gray-700 uppercase">Istilah / Judul Dokumen</label>
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomDocTitle(!isCustomDocTitle)}
                                                className="text-[10px] text-teal-600 hover:text-teal-800 font-bold underline"
                                            >
                                                {isCustomDocTitle ? '← Pilih dari Daftar' : '+ Kustom Judul Bebas'}
                                            </button>
                                        </div>
                                        {isCustomDocTitle ? (
                                            <input
                                                type="text"
                                                value={customDocTitle}
                                                onChange={(e) => setCustomDocTitle(e.target.value)}
                                                placeholder="Contoh: PIAGAM PENGHARGAAN KHATAM JUZ 'AMMA"
                                                className="w-full p-2 bg-white border border-teal-500 rounded-xl text-xs font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
                                            />
                                        ) : (
                                            <select
                                                value={syahadahDocTitle}
                                                onChange={(e) => setSyahadahDocTitle(e.target.value)}
                                                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
                                            >
                                                {PRESET_DOC_TITLES.map((title) => (
                                                    <option key={title} value={title}>{title}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Predikat Kelulusan</label>
                                        <select
                                            value={syahadahPredikat}
                                            onChange={(e) => setSyahadahPredikat(e.target.value)}
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
                                        >
                                            <option value="Mumtaz (Sangat Baik / Istimewa)">Mumtaz (Sangat Baik / Istimewa)</option>
                                            <option value="Jayyid Jiddan (Baik Sekali)">Jayyid Jiddan (Baik Sekali)</option>
                                            <option value="Jayyid (Baik)">Jayyid (Baik)</option>
                                            <option value="Maqbul (Cukup)">Maqbul (Cukup)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* 3. Capaian Selector (Preset / Rentang Juz / Custom) */}
                                <div className="space-y-2 pt-1 border-t border-gray-100">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="text-[11px] font-bold text-gray-700 uppercase">
                                            Jenis / Rentang Capaian Hafalan:
                                        </label>
                                        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setCapaianMode('preset')}
                                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                                    capaianMode === 'preset' ? 'bg-white text-teal-700 shadow-xs' : 'text-gray-600 hover:text-gray-800'
                                                }`}
                                            >
                                                Pilihan Cepat
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCapaianMode('rentang')}
                                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                                    capaianMode === 'rentang' ? 'bg-white text-teal-700 shadow-xs' : 'text-gray-600 hover:text-gray-800'
                                                }`}
                                            >
                                                Rentang Juz (Per 5/10 Juz)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCapaianMode('custom')}
                                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                                    capaianMode === 'custom' ? 'bg-white text-teal-700 shadow-xs' : 'text-gray-600 hover:text-gray-800'
                                                }`}
                                            >
                                                Kustom Bebas
                                            </button>
                                        </div>
                                    </div>

                                    {capaianMode === 'preset' && (
                                        <select
                                            value={syahadahType}
                                            onChange={(e) => setSyahadahType(e.target.value)}
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
                                        >
                                            {PRESET_CAPAIAN.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    )}

                                    {capaianMode === 'rentang' && (
                                        <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-teal-800 mb-0.5">Dari Juz:</label>
                                                    <select
                                                        value={juzStart}
                                                        onChange={(e) => setJuzStart(Number(e.target.value))}
                                                        className="w-full p-1.5 bg-white border border-teal-300 rounded-lg text-xs font-bold text-teal-900"
                                                    >
                                                        {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                                                            <option key={j} value={j}>Juz {j}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-teal-800 mb-0.5">Sampai Juz:</label>
                                                    <select
                                                        value={juzEnd}
                                                        onChange={(e) => setJuzEnd(Number(e.target.value))}
                                                        className="w-full p-1.5 bg-white border border-teal-300 rounded-lg text-xs font-bold text-teal-900"
                                                    >
                                                        {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                                                            <option key={j} value={j}>Juz {j}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-span-2 flex items-center gap-1.5 pt-4 sm:pt-0">
                                                    {[
                                                        { label: 'Juz 1-5', s: 1, e: 5 },
                                                        { label: 'Juz 6-10', s: 6, e: 10 },
                                                        { label: 'Juz 26-30', s: 26, e: 30 },
                                                    ].map((shortcut) => (
                                                        <button
                                                            key={shortcut.label}
                                                            type="button"
                                                            onClick={() => {
                                                                setJuzStart(shortcut.s);
                                                                setJuzEnd(shortcut.e);
                                                            }}
                                                            className="flex-1 py-1 px-2 text-[10px] font-bold bg-white text-teal-700 border border-teal-300 rounded-md hover:bg-teal-100 shadow-2xs"
                                                        >
                                                            {shortcut.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-[11px] text-teal-900 font-semibold bg-white/80 p-2 rounded-lg border border-teal-200">
                                                Hasil Label: <strong className="text-teal-950 font-bold">{getFinalCapaianText()}</strong>
                                            </div>
                                        </div>
                                    )}

                                    {capaianMode === 'custom' && (
                                        <input
                                            type="text"
                                            value={customCapaian}
                                            onChange={(e) => setCustomCapaian(e.target.value)}
                                            placeholder="Contoh: Khatam 5 Juz (Juz 1 s/d Juz 5) & Tahfizh Hadits Arba'in"
                                            className="w-full p-2 bg-white border border-teal-400 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-teal-500"
                                        />
                                    )}
                                </div>

                                {/* 4. Kalimat Pengantar di Atas Nama Santri & Watermark */}
                                <div className="space-y-3 pt-1 border-t border-gray-100">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[11px] font-bold text-gray-700 uppercase">
                                                Kalimat Pengantar (Di Atas Nama Santri)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomKalimat(!isCustomKalimat)}
                                                className="text-[10px] text-teal-600 hover:text-teal-800 font-bold underline"
                                            >
                                                {isCustomKalimat ? '← Pilih Template Kalimat' : '+ Tulis Kustom Bebas'}
                                            </button>
                                        </div>
                                        {isCustomKalimat ? (
                                            <textarea
                                                rows={2}
                                                value={customKalimatPengantar}
                                                onChange={(e) => setCustomKalimatPengantar(e.target.value)}
                                                placeholder="Tuliskan kalimat pengantar sertifikat, contoh: Diberikan sebagai tanda kelulusan tasmi' hafalan Al-Qur'an kepada:"
                                                className="w-full p-2 bg-white border border-teal-500 rounded-xl text-xs text-teal-950 font-medium focus:ring-2 focus:ring-teal-500"
                                            />
                                        ) : (
                                            <select
                                                value={kalimatPengantar}
                                                onChange={(e) => setKalimatPengantar(e.target.value)}
                                                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
                                            >
                                                {PRESET_KALIMAT_PENGANTAR.map((k, idx) => (
                                                    <option key={idx} value={k}>{k}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Watermark Toggle */}
                                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <i className="bi bi-shield-shaded text-teal-700 text-sm"></i>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">Watermark Logo Pondok di Latar Belakang</p>
                                                <p className="text-[10px] text-gray-500">Tampilkan logo resmi pondok sebagai watermark transparan di tengah sertifikat</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showWatermarkLogo}
                                                onChange={(e) => setShowWatermarkLogo(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* 5. Pembimbing Tahfizh / Muhaffizh / Penandatangan */}
                                <div className="space-y-3 pt-2 border-t border-gray-100">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                        <label className="text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1.5">
                                            <i className="bi bi-person-check-fill text-teal-600"></i>
                                            Pembimbing Tahfizh / Penandatangan:
                                        </label>
                                        <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                            {pembimbingSource === 'halaqah' && halaqahMuhaffizh ? `Otomatis: ${halaqahMuhaffizh.nama}` : 
                                             pembimbingSource === 'walikelas' && waliKelasTeacher ? `Wali Kelas: ${waliKelasTeacher.nama}` : 
                                             pembimbingSource === 'pengajar' ? 'Daftar Asatidz' : 'Kustom Manual'}
                                        </span>
                                    </div>

                                    {/* Source Options Pill Selector */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setPembimbingSource('halaqah')}
                                            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                                                pembimbingSource === 'halaqah' ? 'bg-white text-teal-700 shadow-xs ring-1 ring-teal-400' : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <i className="bi bi-diagram-3-fill"></i>
                                            <span>Dari Halaqah</span>
                                            {halaqahMuhaffizh && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Data Pembimbing Tersedia"></span>}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPembimbingSource('walikelas')}
                                            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                                                pembimbingSource === 'walikelas' ? 'bg-white text-teal-700 shadow-xs ring-1 ring-teal-400' : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <i className="bi bi-person-badge"></i>
                                            <span>Wali Kelas</span>
                                            {waliKelasTeacher && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Data Wali Kelas Tersedia"></span>}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPembimbingSource('pengajar')}
                                            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                                                pembimbingSource === 'pengajar' ? 'bg-white text-teal-700 shadow-xs ring-1 ring-teal-400' : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <i className="bi bi-people-fill"></i>
                                            <span>Daftar Guru</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPembimbingSource('manual')}
                                            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                                                pembimbingSource === 'manual' ? 'bg-white text-teal-700 shadow-xs ring-1 ring-teal-400' : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <i className="bi bi-pencil-square"></i>
                                            <span>Tulis Manual</span>
                                        </button>
                                    </div>

                                    {/* Detail selection according to chosen source */}
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        {pembimbingSource === 'halaqah' && (
                                            <div>
                                                {halaqahMuhaffizh ? (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                                <i className="bi bi-check-lg text-base"></i>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-900">{halaqahMuhaffizh.nama}</p>
                                                                <p className="text-[11px] text-teal-700 font-medium">
                                                                    Terhubung via Halaqah: <strong>{santriHalaqah?.nama || 'Kelompok Halaqah'}</strong>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                                                            Otomatis Terisi
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs">
                                                        <div className="flex items-center gap-2 font-bold mb-1">
                                                            <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                                                            Santri belum memiliki pembimbing halaqah
                                                        </div>
                                                        <p className="text-[11px] text-amber-700">
                                                            Santri ini belum terdaftar dalam kelompok halaqah atau kelompoknya belum ditentukan muhaffizh. Anda dapat memilih pembimbing dari <strong>Wali Kelas</strong>, <strong>Daftar Guru</strong>, atau <strong>Tulis Manual</strong> di atas.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {pembimbingSource === 'walikelas' && (
                                            <div>
                                                {waliKelasTeacher ? (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                                <i className="bi bi-person-check text-base"></i>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-900">{waliKelasTeacher.nama}</p>
                                                                <p className="text-[11px] text-blue-700 font-medium">
                                                                    Wali Kelas: <strong>{santriRombel?.nama || santriKelas?.nama || 'Kelas Santri'}</strong>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                                                            Wali Kelas
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs">
                                                        <div className="flex items-center gap-2 font-bold mb-1">
                                                            <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                                                            Wali Kelas belum terdaftar
                                                        </div>
                                                        <p className="text-[11px] text-amber-700">
                                                            Rombel santri ini belum memiliki data wali kelas pada master data rombel. Silakan pilih opsi lain.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {pembimbingSource === 'pengajar' && (
                                            <div className="space-y-2">
                                                <label className="block text-[11px] font-bold text-gray-700">Pilih dari Daftar Ustadz / Pengajar:</label>
                                                <select
                                                    value={selectedPengajarId}
                                                    onChange={(e) => setSelectedPengajarId(Number(e.target.value))}
                                                    className="w-full p-2 bg-white border border-teal-400 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-teal-500"
                                                >
                                                    {settings.tenagaPengajar.map(t => (
                                                        <option key={t.id} value={t.id}>{t.nama} {t.kodeGuru ? `(${t.kodeGuru})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {pembimbingSource === 'manual' && (
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-bold text-gray-700">Nama Pembimbing & Gelar (Tulis Manual):</label>
                                                <input
                                                    type="text"
                                                    value={customPembimbingName}
                                                    onChange={(e) => setCustomPembimbingName(e.target.value)}
                                                    placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I., Al-Hafizh"
                                                    className="w-full p-2 bg-white border border-teal-500 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-teal-500"
                                                />
                                            </div>
                                        )}

                                        {/* Customization for Title & Label */}
                                        <div className="mt-3 pt-2.5 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Label Tanda Tangan Atas:</label>
                                                <input
                                                    type="text"
                                                    value={pembimbingLabelTop}
                                                    onChange={(e) => setPembimbingLabelTop(e.target.value)}
                                                    placeholder="Muhaffizh / Pembimbing,"
                                                    className="w-full p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Jabatan di Bawah Nama:</label>
                                                <input
                                                    type="text"
                                                    value={pembimbingRoleBottom}
                                                    onChange={(e) => setPembimbingRoleBottom(e.target.value)}
                                                    placeholder="Pembimbing Tahfizh"
                                                    className="w-full p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. Titimangsa Syahadah (Tempat & Tanggal Diresmikan / Dikeluarkan) */}
                                <div className="p-3 bg-gradient-to-r from-amber-50/80 to-yellow-50/50 rounded-xl border border-amber-200/80 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="text-[11px] font-bold text-amber-950 uppercase flex items-center gap-1.5">
                                            <i className="bi bi-calendar-check text-amber-600"></i>
                                            Titimangsa Syahadah (Tempat, Tanggal & Opsi Hijriah)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleSaveUniversalSyahadahDate}
                                            disabled={isSavingUniversalSyahadah}
                                            className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
                                            title="Simpan tempat, tanggal & format ini agar otomatis berlaku universal bagi seluruh santri"
                                        >
                                            {isSavingUniversalSyahadah ? <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></span> : <i className="bi bi-floppy"></i>}
                                            <span>Jadikan Default Universal</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Tempat / Kota Penetapan</label>
                                            <input
                                                type="text"
                                                value={syahadahTempat}
                                                onChange={(e) => setSyahadahTempat(e.target.value)}
                                                placeholder={settings.tempatSyahadahDefault || "Contoh: Banyumas"}
                                                className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Tanggal Diresmikan</label>
                                            <input
                                                type="date"
                                                value={syahadahTanggal}
                                                onChange={(e) => setSyahadahTanggal(e.target.value)}
                                                className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Format Tanggal</label>
                                            <select
                                                value={syahadahFormatMode}
                                                onChange={(e) => setSyahadahFormatMode(e.target.value as DateFormatMode)}
                                                className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-amber-500"
                                            >
                                                <option value="masehi">📅 Masehi Saja</option>
                                                <option value="hijriah_masehi">🌙 Masehi & Hijriah (Gabungan)</option>
                                                <option value="hijriah">🕌 Hijriah Saja</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Preview & Manual Hijri Input */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
                                        <div className="text-[11px] text-amber-950 flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-semibold text-gray-500 uppercase">Tampilan:</span>
                                            <span className="font-bold bg-white/80 px-2 py-0.5 rounded border border-amber-200 text-amber-900">
                                                {syahadahTempat || settings.tempatSyahadahDefault || 'Pesantren'}, {formatTanggalDokumen(syahadahTanggal, {
                                                    formatMode: syahadahFormatMode,
                                                    hijriAdjustment: settings.hijriAdjustment || 0,
                                                    manualHijri: syahadahManualHijri
                                                })}
                                            </span>
                                        </div>
                                        {syahadahFormatMode !== 'masehi' && (
                                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                                <span className="text-[10px] text-gray-500 whitespace-nowrap">Teks Hijriah Manual:</span>
                                                <input
                                                    type="text"
                                                    value={syahadahManualHijri}
                                                    onChange={(e) => setSyahadahManualHijri(e.target.value)}
                                                    placeholder="Otomatis (atau ketik manual)"
                                                    className="p-1 px-2 bg-white border border-amber-200 rounded text-xs text-gray-800 w-full sm:w-48 placeholder:text-gray-400"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 7. Notes & Nomor */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Catatan Tambahan (Opsional)</label>
                                        <input
                                            type="text"
                                            value={syahadahCatatan}
                                            onChange={(e) => setSyahadahCatatan(e.target.value)}
                                            placeholder="Tuntas tasmi' dan mutaba'ah dengan tajwid yang baik."
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Kustom No. Surat (Opsional)</label>
                                        <input
                                            type="text"
                                            value={syahadahNomor}
                                            onChange={(e) => setSyahadahNomor(e.target.value)}
                                            placeholder={`Otomatis: SYH/TFZ/${santri.nis || santri.id}/${new Date().getFullYear()}`}
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Print Button */}
                                <button
                                    type="button"
                                    onClick={handlePrintSyahadah}
                                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                                >
                                    <i className="bi bi-printer-fill text-base"></i>
                                    <span>Download / Cetak PDF ({getFinalDocTitle()})</span>
                                </button>
                            </div>

                            {/* Live Certificate Preview Box with Auto-Zoom & Controls */}
                            <div className="bg-slate-800 p-3 sm:p-5 rounded-2xl shadow-inner space-y-3">
                                {/* Preview Controls Bar */}
                                <div className="flex flex-wrap justify-between items-center gap-2 text-slate-300 text-xs border-b border-slate-700 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-amber-400 flex items-center gap-1.5">
                                            <i className="bi bi-eye-fill"></i> Live Preview Piagam:
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            Skala: <strong className="text-white">{Math.round(currentScale * 100)}%</strong>
                                        </span>
                                    </div>
                                    
                                    {/* Zoom Mode Buttons */}
                                    <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setZoomLevel('auto')}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                                zoomLevel === 'auto' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                            }`}
                                            title="Sesuaikan otomatis dengan lebar layar"
                                        >
                                            <i className="bi bi-aspect-ratio mr-1"></i> Auto Fit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setZoomLevel('50')}
                                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                                zoomLevel === '50' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            50%
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setZoomLevel('75')}
                                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                                zoomLevel === '75' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            75%
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setZoomLevel('100')}
                                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                                zoomLevel === '100' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            100%
                                        </button>
                                    </div>
                                </div>

                                {/* Container with Responsive Auto-Zoom (No clipping/cutoff) */}
                                <div 
                                    ref={previewContainerRef}
                                    className="overflow-auto flex justify-center items-start p-1 sm:p-2 bg-slate-900/50 rounded-xl border border-slate-700/50"
                                    style={{ minHeight: '300px' }}
                                >
                                    <div 
                                        style={{ 
                                            width: `${BASE_WIDTH * currentScale}px`, 
                                            height: `${BASE_HEIGHT * currentScale}px`,
                                            position: 'relative'
                                        }}
                                        className="shrink-0 transition-all duration-150"
                                    >
                                        <div 
                                            style={{ 
                                                transform: `scale(${currentScale})`,
                                                transformOrigin: 'top left',
                                                width: `${BASE_WIDTH}px`,
                                                height: `${BASE_HEIGHT}px`,
                                                position: 'absolute',
                                                top: 0,
                                                left: 0
                                            }}
                                            className="shadow-2xl rounded-lg overflow-hidden border border-slate-600"
                                        >
                                            <TahfizhSyahadahTemplate
                                                santri={santri}
                                                settings={{
                                                    ...settings,
                                                    tanggalSyahadahDefault: syahadahTanggal || settings.tanggalSyahadahDefault,
                                                    tempatSyahadahDefault: syahadahTempat.trim() || settings.tempatSyahadahDefault
                                                }}
                                                temaSyahadah={syahadahTheme}
                                                judulDokumen={getFinalDocTitle()}
                                                jenisSyahadah={getFinalCapaianText()}
                                                predikat={syahadahPredikat}
                                                catatan={syahadahCatatan}
                                                kalimatPengantar={getFinalKalimatPengantar()}
                                                showWatermarkLogo={showWatermarkLogo}
                                                nomorSyahadah={syahadahNomor || undefined}
                                                tanggal={syahadahTanggal}
                                                muhaffizhName={getFinalPembimbingName()}
                                                muhaffizhLabelTop={pembimbingLabelTop}
                                                muhaffizhRoleBottom={pembimbingRoleBottom}
                                                formatMode={syahadahFormatMode}
                                                manualHijri={syahadahManualHijri}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white shrink-0 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => {
                            const phone = santri.teleponWali || santri.telepon;
                            if (!phone) {
                                showToast('Nomor WA wali santri belum terdaftar.', 'error');
                                return;
                            }
                            const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
                            const pesan = `Assalamu'alaikum Wr. Wb. Yth. Wali Santri ${santri.namaLengkap}, saat ini ananda telah mencatat ${records.length} setoran tahfizh di ${settings.namaPonpes}.`;
                            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`, '_blank');
                        }}
                        className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl hover:bg-emerald-100 border border-emerald-200"
                    >
                        <i className="bi bi-whatsapp"></i> Hubungi Wali Santri
                    </button>
                    <button onClick={onClose} className="py-2 px-6 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors">
                        Tutup
                    </button>
                </div>

                {/* Hidden Print Areas for Native PDF */}
                <div className="fixed left-[-100000px] top-0 w-[21cm] bg-white" aria-hidden="true">
                    <div id="tahfizh-report-preview">
                         <TahfizhReportTemplate 
                            santri={santri} 
                            records={records} 
                            settings={settings} 
                            startDate={startDate} 
                            endDate={endDate} 
                         />
                    </div>
                    <div id="tahfizh-rapor-print-clean" className="w-[21cm]">
                        <TahfizhSemesterRaporTemplate
                            santri={santri}
                            records={records}
                            settings={{
                                ...settings,
                                tanggalRaporDefault: raporTanggal || settings.tanggalRaporDefault,
                                tempatRaporDefault: raporTempat.trim() || settings.tempatRaporDefault
                            }}
                            semester={raporSemester}
                            tahunAjaran={raporTahunAjaran}
                            tanggalRapor={raporTanggal}
                            targetJuz={santri.targetJuz || 30}
                            catatanMuhaffizh={raporCatatan}
                            
                            orangTuaMode={raporOrangTuaMode}
                            orangTuaName={raporOrangTuaMode === 'manual' ? raporCustomOrangTuaName : undefined}
                            orangTuaLabel={raporOrangTuaMode === 'manual' ? raporCustomOrangTuaLabel : undefined}
                            
                            muhaffizhMode={raporMuhaffizhMode === 'select' ? 'manual' : raporMuhaffizhMode}
                            muhaffizhName={
                                raporMuhaffizhMode === 'select' 
                                    ? settings.tenagaPengajar.find(t => t.id === raporSelectedMuhaffizhId)?.nama 
                                    : raporMuhaffizhMode === 'manual' 
                                        ? raporCustomMuhaffizhName 
                                        : undefined
                            }
                            muhaffizhLabel={raporMuhaffizhMode === 'manual' ? raporCustomMuhaffizhLabel : undefined}
                            
                            mudirMode={raporMudirMode === 'select' ? 'manual' : raporMudirMode}
                            mudirName={
                                raporMudirMode === 'select'
                                    ? settings.tenagaPengajar.find(t => t.id === raporSelectedMudirId)?.nama
                                    : raporMudirMode === 'manual'
                                        ? raporCustomMudirName
                                        : undefined
                            }
                            mudirJabatan={raporMudirMode === 'manual' ? raporCustomMudirJabatan : undefined}
                            
                            petaMode={raporPetaMode}
                            petaJuzStart={raporPetaRentangType === 'range' ? Math.min(raporPetaJuzStart, raporPetaJuzEnd) : raporPetaJuzStart}
                            petaJuzEnd={raporPetaRentangType === 'range' ? Math.max(raporPetaJuzStart, raporPetaJuzEnd) : raporPetaJuzStart}
                            petaJuzTarget={raporPetaJuzStart}
                            formatMode={raporFormatMode}
                            manualHijri={raporManualHijri}
                        />
                    </div>
                    <div id="tahfizh-syahadah-preview" className="w-[29.7cm]">
                        <TahfizhSyahadahTemplate
                            santri={santri}
                            settings={{
                                ...settings,
                                tanggalSyahadahDefault: syahadahTanggal || settings.tanggalSyahadahDefault,
                                tempatSyahadahDefault: syahadahTempat.trim() || settings.tempatSyahadahDefault
                            }}
                            temaSyahadah={syahadahTheme}
                            judulDokumen={getFinalDocTitle()}
                            jenisSyahadah={getFinalCapaianText()}
                            predikat={syahadahPredikat}
                            catatan={syahadahCatatan}
                            kalimatPengantar={getFinalKalimatPengantar()}
                            showWatermarkLogo={showWatermarkLogo}
                            nomorSyahadah={syahadahNomor || undefined}
                            tanggal={syahadahTanggal}
                            muhaffizhName={getFinalPembimbingName()}
                            muhaffizhLabelTop={pembimbingLabelTop}
                            muhaffizhRoleBottom={pembimbingRoleBottom}
                            formatMode={syahadahFormatMode}
                            manualHijri={syahadahManualHijri}
                        />
                    </div>
                </div>

                {/* Sub-Modals: WhatsApp Share & Munaqosyah Exam */}
                <TahfizhWaShareModal
                    isOpen={isWaModalOpen}
                    onClose={() => setIsWaModalOpen(false)}
                    santri={santri}
                    records={records}
                    settings={settings}
                    muhaffizhName={getFinalPembimbingName()}
                />

                <TahfizhMunaqosyahExamModal
                    isOpen={isMunaqosyahModalOpen}
                    onClose={() => setIsMunaqosyahModalOpen(false)}
                    santri={santri}
                    records={records}
                    defaultJuz={selectedExamJuz}
                    muhaffizhName={getFinalPembimbingName()}
                />
            </div>
        </div>
    );
};
