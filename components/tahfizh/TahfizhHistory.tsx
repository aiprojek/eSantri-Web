import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { Santri } from '../../types';
import { TahfizhDetailModal } from './TahfizhDetailModal';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { TahfizhReportTemplate } from './TahfizhReportTemplate';
import { TahfizhSemesterRaporTemplate, SignerMode } from './TahfizhSemesterRaporTemplate';
import { TahfizhExamReportTemplate } from './TahfizhExamReportTemplate';
import { TahfizhSyahadahTemplate } from './TahfizhSyahadahTemplate';
import { TahfizhRombelRekapTemplate, RombelSummaryData } from './TahfizhRombelRekapTemplate';
import { TahfizhMuhaffizhRekapTemplate, MuhaffizhSummaryData } from './TahfizhMuhaffizhRekapTemplate';
import { printExportFacade } from '../../utils/printExportFacade';
import { buildStandardExportFileName } from '../../utils/exportFileName';
import { DateFormatMode, formatTanggalDokumen } from '../../utils/formatters';
import { TAHFIZH_CATATAN_PRESETS } from '../../data/tahfizhCatatanPresets';

type BatchReportType = 'rapor-semester' | 'perkembangan' | 'ujian' | 'syahadah' | 'rekap-rombel' | 'rekap-muhaffizh';
type ExportAction = 'print' | 'pdf-image' | 'pdf-table' | 'excel' | 'html';

export const TahfizhHistory: React.FC = () => {
    const { settings, showToast } = useAppContext();
    const { santriList, tahfizhList } = useSantriContext();
    
    // Filters
    const [search, setSearch] = useState('');
    const [halaqahId, setHalaqahId] = useState<number>(0);
    const [jenjangId, setJenjangId] = useState<number>(0);
    const [kelasId, setKelasId] = useState<number>(0);
    const [rombelId, setRombelId] = useState<number>(0);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const currentDate = new Date();
    const [startDate, setStartDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0]);
    
    // Batch Export & Print Configuration State
    const [batchReportType, setBatchReportType] = useState<BatchReportType>('rapor-semester');
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Titimangsa & Print Settings for Batch Print
    const [batchTanggalRapor, setBatchTanggalRapor] = useState(settings.tanggalRaporDefault || new Date().toISOString().split('T')[0]);
    const [batchTempatRapor, setBatchTempatRapor] = useState(settings.tempatRaporDefault || settings.alamat?.split(',')[1]?.trim() || settings.alamat?.split(',')[0]?.trim() || 'Pondok');
    const [batchDateFormatMode, setBatchDateFormatMode] = useState<DateFormatMode>(settings.formatTanggalRaporDefault || 'masehi');
    const [batchManualHijri, setBatchManualHijri] = useState(settings.manualHijriRaporDefault || '');
    const [batchTargetSantriMode, setBatchTargetSantriMode] = useState<'all' | 'has_records' | 'mutqin_only'>('all');
    const [batchSemester, setBatchSemester] = useState<'Ganjil' | 'Genap'>((settings as any).semesterAktif || 'Ganjil');
    const [batchTahunAjaran, setBatchTahunAjaran] = useState((settings as any).tahunAjaran || '2026/2027');
    const [batchPetaMode, setBatchPetaMode] = useState<'grid30' | 'perSurah'>('grid30');
    const [batchPetaRentangType, setBatchPetaRentangType] = useState<'single' | 'range'>('single');
    const [batchPetaJuzStart, setBatchPetaJuzStart] = useState<number>(30);
    const [batchPetaJuzEnd, setBatchPetaJuzEnd] = useState<number>(30);
    const [batchSignerMode, setBatchSignerMode] = useState<SignerMode>('auto');
    const [batchDefaultCatatan, setBatchDefaultCatatan] = useState("Alhamdulillah ananda menunjukkan kesungguhan dan adab yang baik dalam halaqah tahfizh. Mohon terus didampingi muraja'ah di rumah.");

    // Modal State
    const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

    // Derived Data
    const availableKelas = useMemo(() => jenjangId ? settings.kelas.filter(k => k.jenjangId === jenjangId) : [], [jenjangId, settings.kelas]);
    const availableRombel = useMemo(() => kelasId ? settings.rombel.filter(r => r.kelasId === kelasId) : [], [kelasId, settings.rombel]);

    // Grouping Records by Santri
    const santriRecordsMap = useMemo(() => {
        const map = new Map<number, typeof tahfizhList>();
        tahfizhList.forEach(rec => {
            if (!map.has(rec.santriId)) map.set(rec.santriId, []);
            map.get(rec.santriId)?.push(rec);
        });
        return map;
    }, [tahfizhList]);

    const filteredSantri = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            
            const matchSearch = s.namaLengkap.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search);
            const matchHalaqah = !halaqahId || s.halaqahId === halaqahId;
            const matchJenjang = !jenjangId || s.jenjangId === jenjangId;
            const matchKelas = !kelasId || s.kelasId === kelasId;
            const matchRombel = !rombelId || s.rombelId === rombelId;

            return matchSearch && matchHalaqah && matchJenjang && matchKelas && matchRombel;
        }).sort((a,b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [santriList, search, halaqahId, jenjangId, kelasId, rombelId]);

    const filteredSantriIds = useMemo(() => new Set(filteredSantri.map(s => s.id)), [filteredSantri]);
    
    const filteredRecords = useMemo(() => tahfizhList.filter(record => {
        if (!filteredSantriIds.has(record.santriId)) return false;
        return record.tanggal >= startDate && record.tanggal <= endDate;
    }), [tahfizhList, filteredSantriIds, startDate, endDate]);

    const examRecords = useMemo(
        () => filteredRecords.filter(record => record.tipe === 'Ujian Hafalan'),
        [filteredRecords]
    );

    const santriWithRecordsInPeriod = useMemo(
        () => filteredSantri.filter(santri => filteredRecords.some(record => record.santriId === santri.id)),
        [filteredSantri, filteredRecords]
    );

    const santriMutqinList = useMemo(
        () => filteredSantri.filter(santri => {
            const records = santriRecordsMap.get(santri.id) || [];
            return records.some(r => r.tipe === 'Ujian Hafalan' && r.predikat !== 'Belum Lulus');
        }),
        [filteredSantri, santriRecordsMap]
    );

    // Selected Santri batch for Rapor & Syahadah based on target filter
    const targetSantriForPrint = useMemo(() => {
        if (batchTargetSantriMode === 'has_records') {
            return santriWithRecordsInPeriod;
        }
        if (batchTargetSantriMode === 'mutqin_only') {
            return santriMutqinList;
        }
        return filteredSantri;
    }, [batchTargetSantriMode, santriWithRecordsInPeriod, santriMutqinList, filteredSantri]);

    const filterLabel = useMemo(() => {
        const halaqah = (settings.kelompokHalaqah || []).find(h => h.id === halaqahId)?.nama;
        const jenjang = settings.jenjang.find(item => item.id === jenjangId)?.nama;
        const kelas = settings.kelas.find(item => item.id === kelasId)?.nama;
        const rombel = settings.rombel.find(item => item.id === rombelId)?.nama;
        return [halaqah || 'Semua Halaqah', jenjang || 'Semua Jenjang', kelas || 'Semua Kelas', rombel || 'Semua Rombel'].filter(Boolean).join(' / ');
    }, [halaqahId, jenjangId, kelasId, rombelId, settings.kelompokHalaqah, settings.jenjang, settings.kelas, settings.rombel]);

    const getLatestRecord = (santriId: number) => {
        const records = santriRecordsMap.get(santriId);
        if (!records || records.length === 0) return null;
        return records.reduce((latest, current) => {
            const latestDate = new Date(latest.tanggal).getTime();
            const currentDate = new Date(current.tanggal).getTime();
            return currentDate > latestDate ? current : latest;
        });
    };

    const getMutqinJuzCount = (santriId: number) => {
        const records = santriRecordsMap.get(santriId) || [];
        const passedJuzs = new Set(
            records.filter(r => r.tipe === 'Ujian Hafalan' && r.predikat !== 'Belum Lulus').map(r => r.juz)
        );
        return passedJuzs.size;
    };

    // ==========================================
    // AGGREGATED STATS: Rombel Summary Data
    // ==========================================
    const rombelSummaryData: RombelSummaryData[] = useMemo(() => {
        const map = new Map<number, RombelSummaryData>();
        
        // Populate all matching rombels first
        const rombelsToInclude = rombelId 
            ? settings.rombel.filter(r => r.id === rombelId)
            : kelasId 
                ? settings.rombel.filter(r => r.kelasId === kelasId)
                : settings.rombel;

        rombelsToInclude.forEach(r => {
            const kelas = settings.kelas.find(k => k.id === r.kelasId);
            const jenjang = settings.jenjang.find(j => j.id === kelas?.jenjangId);
            const santriInRombel = filteredSantri.filter(s => s.rombelId === r.id);

            map.set(r.id, {
                rombelId: r.id,
                rombelName: r.nama,
                kelasName: kelas?.nama || '-',
                jenjangName: jenjang?.nama || '-',
                totalSantri: santriInRombel.length,
                totalSetoran: 0,
                ziyadah: 0,
                murojaah: 0,
                tasmi: 0,
                ujian: 0,
                totalTeguran: 0,
                totalKesalahan: 0,
                tajwid: 0,
                makhraj: 0,
                kelancaran: 0,
                terlewat: 0,
                lancarCount: 0,
                kurangLancarCount: 0,
                mutqinSantriCount: 0
            });
        });

        // Add "Tanpa Rombel" if any
        const noRombelSantri = filteredSantri.filter(s => !s.rombelId);
        if (noRombelSantri.length > 0 && !rombelId && !kelasId) {
            map.set(0, {
                rombelId: 0,
                rombelName: 'Tanpa Rombel',
                kelasName: '-',
                jenjangName: '-',
                totalSantri: noRombelSantri.length,
                totalSetoran: 0,
                ziyadah: 0,
                murojaah: 0,
                tasmi: 0,
                ujian: 0,
                totalTeguran: 0,
                totalKesalahan: 0,
                tajwid: 0,
                makhraj: 0,
                kelancaran: 0,
                terlewat: 0,
                lancarCount: 0,
                kurangLancarCount: 0,
                mutqinSantriCount: 0
            });
        }

        // Aggregate record metrics
        filteredRecords.forEach(record => {
            const santri = santriList.find(s => s.id === record.santriId);
            const rId = santri?.rombelId || 0;
            if (!map.has(rId)) return;

            const entry = map.get(rId)!;
            entry.totalSetoran += 1;
            if (record.tipe === 'Ziyadah') entry.ziyadah += 1;
            if (record.tipe === 'Murojaah') entry.murojaah += 1;
            if (record.tipe === "Tasmi'") entry.tasmi += 1;
            if (record.tipe === 'Ujian Hafalan') entry.ujian += 1;

            entry.totalTeguran += (record.jumlahTeguran || 0);
            entry.totalKesalahan += (record.jumlahKesalahan || 0);
            if (record.kategoriKesalahan) {
                entry.tajwid += (record.kategoriKesalahan.tajwid || 0);
                entry.makhraj += (record.kategoriKesalahan.makhraj || 0);
                entry.kelancaran += (record.kategoriKesalahan.kelancaran || 0);
                entry.terlewat += (record.kategoriKesalahan.terlewat || 0);
            }

            if (record.predikat === 'Lancar' || record.predikat === 'Sangat Lancar') {
                entry.lancarCount += 1;
            } else {
                entry.kurangLancarCount += 1;
            }
        });

        return Array.from(map.values()).sort((a, b) => a.rombelName.localeCompare(b.rombelName));
    }, [filteredSantri, filteredRecords, settings.rombel, settings.kelas, settings.jenjang, rombelId, kelasId, santriList]);

    // ==========================================
    // AGGREGATED STATS: Muhaffizh Summary Data
    // ==========================================
    const muhaffizhSummaryData: MuhaffizhSummaryData[] = useMemo(() => {
        const map = new Map<number, MuhaffizhSummaryData>();

        // Find relevant muhaffizh
        const halaqahList = settings.kelompokHalaqah || [];
        const teachers = settings.tenagaPengajar || [];

        teachers.forEach(t => {
            const halaqahsOfTeacher = halaqahList.filter(h => h.muhaffizhId === t.id);
            const halaqahNames = halaqahsOfTeacher.map(h => h.nama);
            
            // Santri belonging to this teacher's halaqah
            const santriOfTeacher = filteredSantri.filter(s => {
                return halaqahsOfTeacher.some(h => h.id === s.halaqahId);
            });

            // If filtering by halaqah, check if this teacher belongs to it
            if (halaqahId && !halaqahsOfTeacher.some(h => h.id === halaqahId)) {
                return;
            }

            map.set(t.id, {
                muhaffizhId: t.id,
                muhaffizhName: t.nama,
                halaqahNames,
                totalSantri: santriOfTeacher.length,
                totalSetoran: 0,
                ziyadah: 0,
                murojaah: 0,
                tasmi: 0,
                ujian: 0,
                totalTeguran: 0,
                totalKesalahan: 0,
                tajwid: 0,
                makhraj: 0,
                kelancaran: 0,
                terlewat: 0,
                lancarCount: 0,
                kurangLancarCount: 0
            });
        });

        // Unassigned or direct muhaffizhId in record
        filteredRecords.forEach(record => {
            const mId = record.muhaffizhId || 0;
            if (mId && map.has(mId)) {
                const entry = map.get(mId)!;
                entry.totalSetoran += 1;
                if (record.tipe === 'Ziyadah') entry.ziyadah += 1;
                if (record.tipe === 'Murojaah') entry.murojaah += 1;
                if (record.tipe === "Tasmi'") entry.tasmi += 1;
                if (record.tipe === 'Ujian Hafalan') entry.ujian += 1;

                entry.totalTeguran += (record.jumlahTeguran || 0);
                entry.totalKesalahan += (record.jumlahKesalahan || 0);
                if (record.kategoriKesalahan) {
                    entry.tajwid += (record.kategoriKesalahan.tajwid || 0);
                    entry.makhraj += (record.kategoriKesalahan.makhraj || 0);
                    entry.kelancaran += (record.kategoriKesalahan.kelancaran || 0);
                    entry.terlewat += (record.kategoriKesalahan.terlewat || 0);
                }

                if (record.predikat === 'Lancar' || record.predikat === 'Sangat Lancar') {
                    entry.lancarCount += 1;
                } else {
                    entry.kurangLancarCount += 1;
                }
            }
        });

        return Array.from(map.values())
            .filter(item => item.totalSantri > 0 || item.totalSetoran > 0)
            .sort((a, b) => a.muhaffizhName.localeCompare(b.muhaffizhName));
    }, [filteredSantri, filteredRecords, settings.kelompokHalaqah, settings.tenagaPengajar, halaqahId]);

    const triggerCsvDownload = (filename: string, rows: string[][]) => {
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportByRombel = () => {
        if (rombelSummaryData.length === 0) {
            showToast('Tidak ada data rombel untuk diekspor.', 'info');
            return;
        }

        const csvRows: string[][] = [[
            'Rombel / Kelas', 'Jenjang', 'Jumlah Santri', 'Total Setoran', 
            'Ziyadah', 'Murojaah', "Tasmi'", 'Ujian Hafalan', 
            'Total Teguran', 'Total Kesalahan', 'Kendala Tajwid', 'Kendala Makhraj', 'Kendala Kelancaran', 'Kendala Terlewat'
        ]];

        rombelSummaryData.forEach(item => {
            csvRows.push([
                item.rombelName, item.jenjangName, String(item.totalSantri), String(item.totalSetoran),
                String(item.ziyadah), String(item.murojaah), String(item.tasmi), String(item.ujian),
                String(item.totalTeguran), String(item.totalKesalahan),
                String(item.tajwid), String(item.makhraj), String(item.kelancaran), String(item.terlewat)
            ]);
        });

        triggerCsvDownload(`rekap-tahfizh-per-rombel-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
        showToast('Rekap tahfizh per rombel (lengkap) berhasil diekspor ke CSV.', 'success');
    };

    const handleExportByMuhaffizh = () => {
        if (muhaffizhSummaryData.length === 0) {
            showToast('Tidak ada data pembimbing untuk diekspor.', 'info');
            return;
        }

        const csvRows: string[][] = [[
            'Nama Muhaffizh', 'Halaqah Binaan', 'Jumlah Santri', 'Total Setoran Terbimbing',
            'Ziyadah', 'Murojaah', "Tasmi'", 'Ujian Hafalan',
            'Total Teguran', 'Total Kesalahan', 'Kendala Tajwid', 'Kendala Makhraj', 'Kendala Kelancaran', 'Kendala Terlewat'
        ]];

        muhaffizhSummaryData.forEach(item => {
            csvRows.push([
                item.muhaffizhName, item.halaqahNames.join('; '), String(item.totalSantri), String(item.totalSetoran),
                String(item.ziyadah), String(item.murojaah), String(item.tasmi), String(item.ujian),
                String(item.totalTeguran), String(item.totalKesalahan),
                String(item.tajwid), String(item.makhraj), String(item.kelancaran), String(item.terlewat)
            ]);
        });

        triggerCsvDownload(`rekap-tahfizh-per-muhaffizh-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
        showToast('Rekap tahfizh per muhaffizh (lengkap) berhasil diekspor ke CSV.', 'success');
    };

    // Main Batch Print / Export Router
    const runBatchExport = async (action: ExportAction) => {
        if (startDate > endDate) {
            showToast('Tanggal awal tidak boleh melewati tanggal akhir.', 'error');
            return;
        }

        let elementId = '';
        let fileNamePrefix = '';
        let paperSize = 'A4';
        let targetCount = 0;

        if (batchReportType === 'rapor-semester') {
            elementId = 'tahfizh-semester-batch-report';
            fileNamePrefix = 'buku-rapor-tahfizh-semester';
            targetCount = targetSantriForPrint.length;
        } else if (batchReportType === 'perkembangan') {
            elementId = 'tahfizh-progress-batch-report';
            fileNamePrefix = 'laporan-perkembangan-tahfizh';
            targetCount = targetSantriForPrint.length;
        } else if (batchReportType === 'ujian') {
            elementId = 'tahfizh-exam-batch-report';
            fileNamePrefix = 'rekap-ujian-tahfizh';
            targetCount = examRecords.length;
        } else if (batchReportType === 'syahadah') {
            elementId = 'tahfizh-syahadah-batch-report';
            fileNamePrefix = 'syahadah-tahfizh-massal';
            targetCount = targetSantriForPrint.length;
        } else if (batchReportType === 'rekap-rombel') {
            elementId = 'tahfizh-rombel-batch-report';
            fileNamePrefix = 'rekap-tahfizh-per-rombel';
            targetCount = rombelSummaryData.length;
        } else if (batchReportType === 'rekap-muhaffizh') {
            elementId = 'tahfizh-muhaffizh-batch-report';
            fileNamePrefix = 'rekap-tahfizh-per-muhaffizh';
            targetCount = muhaffizhSummaryData.length;
        }

        if (targetCount === 0) {
            showToast('Tidak ada data yang sesuai untuk diekspor pada filter ini.', 'info');
            return;
        }

        const fileName = buildStandardExportFileName(
            fileNamePrefix,
            [filterLabel, startDate, endDate]
        );

        setIsExporting(true);
        setIsActionMenuOpen(false);

        // Small delay to allow React to mount the batch document DOM tree before printing/exporting
        await new Promise(resolve => setTimeout(resolve, 80));

        try {
            if (action === 'print') {
                await printExportFacade.printDialog({ elementId, fileName, paperSize, target: 'report' });
            } else if (action === 'pdf-image') {
                await printExportFacade.downloadPdfImage({ elementId, fileName, paperSize, target: 'report' });
            } else if (action === 'pdf-table') {
                await printExportFacade.downloadPdfAutoTable({ elementId, fileName, paperSize, target: 'report' });
            } else if (action === 'excel') {
                await printExportFacade.downloadExcelVisual({ elementId, fileName, paperSize, target: 'report' });
            } else {
                printExportFacade.downloadHtml({ elementId, fileName, paperSize, target: 'report' });
            }
            showToast('Dokumen Tahfizh massal berhasil diproses.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Gagal memproses dokumen Tahfizh massal.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Filter Section */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 sticky top-16 z-30">
                {/* Mobile Filter Trigger */}
                <div className="md:hidden flex flex-col gap-2">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter Data</span>
                    </button>
                    <div className="relative">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Cari santri / NIS..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-teal-500"
                        />
                    </div>
                </div>

                {/* Desktop Filter View */}
                <div className="hidden md:grid md:grid-cols-5 gap-3">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Cari Santri</label>
                        <div className="relative">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama / NIS..." className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Kelompok Halaqah</label>
                        <select value={halaqahId} onChange={e => setHalaqahId(Number(e.target.value))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all text-teal-900">
                            <option value={0}>Semua Halaqah</option>
                            {(settings.kelompokHalaqah || []).map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Jenjang</label>
                        <select value={jenjangId} onChange={e => { setJenjangId(Number(e.target.value)); setKelasId(0); setRombelId(0); }} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value={0}>Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Kelas</label>
                        <select value={kelasId} onChange={e => { setKelasId(Number(e.target.value)); setRombelId(0); }} disabled={!jenjangId} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all disabled:bg-gray-100 disabled:text-gray-400">
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Rombel</label>
                        <select value={rombelId} onChange={e => setRombelId(Number(e.target.value))} disabled={!kelasId} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all disabled:bg-gray-100 disabled:text-gray-400">
                            <option value={0}>Semua Rombel</option>
                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                </div>

                {/* Quick Export & Actions Toolbar */}
                <div className="mt-3.5 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                            <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i> Ekspor Rekap:
                        </span>
                        <div className="inline-flex rounded-xl shadow-2xs border border-emerald-300 overflow-hidden">
                            <button
                                onClick={handleExportByRombel}
                                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 transition-colors"
                                title="Ekspor CSV Rekapitulasi per Rombel (Lengkap dengan Teguran & Kesalahan)"
                            >
                                <i className="bi bi-filetype-csv"></i> CSV Rombel
                            </button>
                            <button
                                onClick={() => {
                                    setBatchReportType('rekap-rombel');
                                    runBatchExport('excel');
                                }}
                                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors border-l border-emerald-500"
                                title="Ekspor Excel Rekapitulasi per Rombel Berformat Rapi"
                            >
                                <i className="bi bi-file-earmark-excel-fill"></i> Excel Rombel
                            </button>
                        </div>

                        <div className="inline-flex rounded-xl shadow-2xs border border-blue-300 overflow-hidden">
                            <button
                                onClick={handleExportByMuhaffizh}
                                className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800 transition-colors"
                                title="Ekspor CSV Rekapitulasi Kinerja Pembimbing & Halaqah"
                            >
                                <i className="bi bi-filetype-csv"></i> CSV Muhaffizh
                            </button>
                            <button
                                onClick={() => {
                                    setBatchReportType('rekap-muhaffizh');
                                    runBatchExport('excel');
                                }}
                                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition-colors border-l border-blue-500"
                                title="Ekspor Excel Rekapitulasi Muhaffizh Berformat Rapi"
                            >
                                <i className="bi bi-file-earmark-excel-fill"></i> Excel Muhaffizh
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsConfigOpen(prev => !prev)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                            isConfigOpen ? 'bg-teal-700 text-white border-teal-700 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-teal-50 hover:text-teal-800'
                        }`}
                    >
                        <i className={`bi ${isConfigOpen ? 'bi-sliders2-vertical' : 'bi-gear-fill'} text-xs`}></i>
                        <span>{isConfigOpen ? 'Tutup Pengaturan Cetak' : 'Pengaturan Titimangsa & Cetak Massal'}</span>
                    </button>
                </div>
            </div>

            {/* Batch Action Toolbar */}
            <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                        <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-2">
                            <i className="bi bi-printer-fill text-teal-600 text-base"></i> Cetak & Ekspor Dokumen Massal Tahfizh
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Cetak borongan rapor semesteran, piagam syahadah, buku mutaba'ah, dan rekap evaluasi untuk seluruh santri sesuai filter aktif.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl">
                            {batchReportType === 'rapor-semester' && `📘 ${targetSantriForPrint.length} Buku Rapor Siap Cetak`}
                            {batchReportType === 'perkembangan' && `📋 ${targetSantriForPrint.length} Lembar Mutaba'ah`}
                            {batchReportType === 'ujian' && `📝 ${examRecords.length} Catatan Munaqosyah`}
                            {batchReportType === 'syahadah' && `📜 ${targetSantriForPrint.length} Piagam Syahadah`}
                            {batchReportType === 'rekap-rombel' && `📊 ${rombelSummaryData.length} Rombel / Kelas`}
                            {batchReportType === 'rekap-muhaffizh' && `👨‍🏫 ${muhaffizhSummaryData.length} Pembimbing`}
                        </span>
                    </div>
                </div>

                {/* Main Controls Grid */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Jenis Dokumen Massal</label>
                        <select 
                            value={batchReportType} 
                            onChange={event => setBatchReportType(event.target.value as BatchReportType)} 
                            className="w-full rounded-xl border border-teal-300 bg-teal-50/50 p-2.5 text-xs font-extrabold text-teal-950 focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="rapor-semester">📘 Buku Rapor Semesteran Tahfizh</option>
                            <option value="perkembangan">📋 Laporan Perkembangan Mutaba'ah</option>
                            <option value="ujian">📝 Rekap Ujian Hafalan & Munaqosyah</option>
                            <option value="syahadah">📜 Syahadah / Piagam Tahfizh Massal</option>
                            <option value="rekap-rombel">📊 Rekapitulasi Tahfizh per Rombel</option>
                            <option value="rekap-muhaffizh">👨‍🏫 Rekapitulasi Kinerja Muhaffizh</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Dari Tanggal (Periode)</label>
                        <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold" />
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Sampai Tanggal (Periode)</label>
                        <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold" />
                    </div>
                    <div className="relative">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Aksi Cetak / Unduh</label>
                        <button
                            type="button"
                            disabled={isExporting}
                            onClick={() => setIsActionMenuOpen(open => !open)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-teal-800 disabled:opacity-60 shadow-md transition-all"
                        >
                            <i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-printer'}`}></i>
                            {isExporting ? 'Memproses...' : 'Cetak & Ekspor Massal'}
                            <i className="bi bi-chevron-down text-xs ml-1"></i>
                        </button>
                        {isActionMenuOpen && (
                            <div className="absolute right-0 top-full z-40 mt-1 w-full min-w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1.5 shadow-2xl animate-scale-up">
                                <button onClick={() => runBatchExport('print')} className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-teal-50 text-gray-800 flex items-center">
                                    <i className="bi bi-printer-fill mr-2 text-teal-700 text-sm"></i> Preview & Cetak Langsung (A4)
                                </button>
                                <button onClick={() => runBatchExport('pdf-image')} className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-red-50 text-gray-800 flex items-center">
                                    <i className="bi bi-file-earmark-pdf-fill mr-2 text-red-600 text-sm"></i> Unduh PDF Visual
                                </button>
                                <button onClick={() => runBatchExport('pdf-table')} className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-red-50 text-gray-800 flex items-center">
                                    <i className="bi bi-table mr-2 text-red-600 text-sm"></i> PDF Format Tabel
                                </button>
                                <button onClick={() => runBatchExport('excel')} className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-emerald-50 text-gray-800 flex items-center">
                                    <i className="bi bi-file-earmark-excel-fill mr-2 text-emerald-600 text-sm"></i> Ekspor ke Excel (.xlsx)
                                </button>
                                <button onClick={() => runBatchExport('html')} className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-blue-50 text-gray-800 flex items-center">
                                    <i className="bi bi-code-slash mr-2 text-blue-600 text-sm"></i> Unduh Dokumen HTML
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expandable Advanced Print & Titimangsa Settings */}
                {isConfigOpen && (
                    <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                            <span className="text-xs font-extrabold text-teal-900 flex items-center gap-1.5">
                                <i className="bi bi-calendar2-range-fill text-teal-700"></i> Pengaturan Titimangsa Dokumen & Tanda Tangan Massal
                            </span>
                            <span className="text-[10px] text-teal-700 italic">
                                Pengaturan ini diterapkan ke seluruh lembar yang dicetak
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Target Santri yang Dicetak</label>
                                <select 
                                    value={batchTargetSantriMode} 
                                    onChange={e => setBatchTargetSantriMode(e.target.value as any)} 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
                                >
                                    <option value="all">Semua Santri Aktif ({filteredSantri.length} santri)</option>
                                    <option value="has_records">Hanya yang Ada Setoran Periode Ini ({santriWithRecordsInPeriod.length} santri)</option>
                                    <option value="mutqin_only">Hanya yang Lulus Ujian / Mutqin ({santriMutqinList.length} santri)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Tempat Penerbitan</label>
                                <input 
                                    type="text" 
                                    value={batchTempatRapor} 
                                    onChange={e => setBatchTempatRapor(e.target.value)} 
                                    placeholder="Contoh: Kediri / Jombang" 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Tanggal Dokumen / Rapor</label>
                                <input 
                                    type="date" 
                                    value={batchTanggalRapor} 
                                    onChange={e => setBatchTanggalRapor(e.target.value)} 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Format Tanggal (Kalender)</label>
                                <select 
                                    value={batchDateFormatMode} 
                                    onChange={e => setBatchDateFormatMode(e.target.value as DateFormatMode)} 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
                                >
                                    <option value="masehi">📅 Masehi Standar</option>
                                    <option value="hijriah_masehi">🌙 Masehi & Hijriah (Gabungan)</option>
                                    <option value="hijriah">🕌 Hijriah Saja</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 2 of config: Hijri Manual & Rapor options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Teks Hijriah Manual (Opsional)</label>
                                <input 
                                    type="text" 
                                    value={batchManualHijri} 
                                    onChange={e => setBatchManualHijri(e.target.value)} 
                                    placeholder="Contoh: 15 Syawal 1447 H" 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Format Visualisasi Peta Hafalan</label>
                                <select 
                                    value={batchPetaMode} 
                                    onChange={e => setBatchPetaMode(e.target.value as any)} 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
                                >
                                    <option value="grid30">Grid Komprehensif (30 Juz)</option>
                                    <option value="perSurah">Detail Per Surah / Rentang Target</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Semester & Tahun Ajaran</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <select 
                                        value={batchSemester} 
                                        onChange={e => setBatchSemester(e.target.value as any)} 
                                        className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold"
                                    >
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        value={batchTahunAjaran} 
                                        onChange={e => setBatchTahunAjaran(e.target.value)} 
                                        className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-center" 
                                        placeholder="2026/2027"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Penandatangan Rapor (3 Kolom)</label>
                                <select 
                                    value={batchSignerMode} 
                                    onChange={e => setBatchSignerMode(e.target.value as SignerMode)} 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
                                >
                                    <option value="auto">Otomatis (Sesuai Data Wali, Muhaffizh, Mudir)</option>
                                    <option value="dots">Manual Titik-titik (Untuk Tulis Basah)</option>
                                </select>
                            </div>
                        </div>

                        {/* Opsi Pemilihan Rentang Juz jika Format Peta Detail Per Surah Dipilih */}
                        {batchPetaMode === 'perSurah' && (
                            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 pb-2">
                                    <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                                        <i className="bi bi-diagram-3-fill text-teal-600"></i> Pilihan Target Juz untuk Peta Hafalan Per Surah:
                                    </span>
                                    <div className="inline-flex rounded-md border border-teal-300 bg-white p-0.5 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBatchPetaRentangType('single');
                                                setBatchPetaJuzStart(30);
                                                setBatchPetaJuzEnd(30);
                                            }}
                                            className={`px-2 py-0.5 rounded font-bold transition-all ${
                                                batchPetaRentangType === 'single'
                                                    ? 'bg-teal-700 text-white'
                                                    : 'text-teal-900 hover:bg-teal-50'
                                            }`}
                                        >
                                            1 Juz Saja
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBatchPetaRentangType('range')}
                                            className={`px-2 py-0.5 rounded font-bold transition-all ${
                                                batchPetaRentangType === 'range'
                                                    ? 'bg-teal-700 text-white'
                                                    : 'text-teal-900 hover:bg-teal-50'
                                            }`}
                                        >
                                            Rentang Juz (Misal Juz 30 - 29)
                                        </button>
                                    </div>
                                </div>

                                {/* Selector */}
                                {batchPetaRentangType === 'single' ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <label className="text-xs font-bold text-teal-950 shrink-0">Pilih Juz:</label>
                                        <select
                                            value={batchPetaJuzStart}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setBatchPetaJuzStart(val);
                                                setBatchPetaJuzEnd(val);
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
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <label className="text-xs font-bold text-teal-950 shrink-0">Dari:</label>
                                        <select
                                            value={batchPetaJuzStart}
                                            onChange={(e) => setBatchPetaJuzStart(Number(e.target.value))}
                                            className="p-1.5 bg-white border border-teal-400 rounded-lg text-xs font-bold text-teal-950"
                                        >
                                            {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                                <option key={j} value={j}>Juz {j}</option>
                                            ))}
                                        </select>
                                        <span className="text-xs font-bold text-teal-900">s/d</span>
                                        <select
                                            value={batchPetaJuzEnd}
                                            onChange={(e) => setBatchPetaJuzEnd(Number(e.target.value))}
                                            className="p-1.5 bg-white border border-teal-400 rounded-lg text-xs font-bold text-teal-950"
                                        >
                                            {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                                <option key={j} value={j}>Juz {j}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Quick shortcuts */}
                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                    <span className="text-gray-500 font-semibold mr-1">Pilihan Cepat:</span>
                                    {batchPetaRentangType === 'single' ? (
                                        [30, 29, 28, 1, 2].map(j => (
                                            <button
                                                key={j}
                                                type="button"
                                                onClick={() => {
                                                    setBatchPetaJuzStart(j);
                                                    setBatchPetaJuzEnd(j);
                                                }}
                                                className={`px-2 py-0.5 rounded font-bold border transition-all ${
                                                    batchPetaJuzStart === j && batchPetaJuzEnd === j
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
                                            { s: 1, e: 30, label: "Semua (1 - 30)" },
                                        ].map(r => {
                                            const isMatch = (batchPetaJuzStart === r.s && batchPetaJuzEnd === r.e) || (batchPetaJuzStart === r.e && batchPetaJuzEnd === r.s);
                                            return (
                                                <button
                                                    key={r.label}
                                                    type="button"
                                                    onClick={() => {
                                                        setBatchPetaJuzStart(r.s);
                                                        setBatchPetaJuzEnd(r.e);
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

                                <div className="text-[10px] text-teal-700 italic">
                                    💡 Menampilkan daftar surat pada Juz {batchPetaJuzStart} {batchPetaJuzStart !== batchPetaJuzEnd ? `s/d Juz ${batchPetaJuzEnd}` : ''} agar tampilan rapor semester massal ringkas dan tidak terlalu padat/lebar.
                                </div>
                            </div>
                        )}

                        {/* Catatan default dengan Preset & Manual */}
                        <div className="space-y-2 bg-white p-2.5 rounded-xl border border-teal-200">
                            <div className="flex flex-wrap justify-between items-center gap-1">
                                <label className="block text-[10px] font-bold text-gray-700 uppercase">
                                    Catatan Evaluasi Muhaffizh Default (Buku Rapor)
                                </label>
                                <span className="text-[9.5px] text-gray-500 font-medium">
                                    {batchDefaultCatatan.length} karakter (maks. 2 baris tercetak)
                                </span>
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                                {TAHFIZH_CATATAN_PRESETS.slice(0, 6).map((preset) => {
                                    const isSelected = batchDefaultCatatan === preset.text;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => setBatchDefaultCatatan(preset.text)}
                                            className={`text-[9.5px] px-2 py-0.5 rounded-lg border font-medium transition-all text-left ${
                                                isSelected
                                                    ? 'bg-teal-700 text-white border-teal-800 shadow-2xs font-bold'
                                                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:border-teal-400 hover:bg-teal-50/50'
                                            }`}
                                            title={preset.text}
                                        >
                                            <span className="opacity-75 font-semibold">[{preset.kategori}]</span> {preset.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <input 
                                type="text" 
                                value={batchDefaultCatatan} 
                                onChange={e => setBatchDefaultCatatan(e.target.value)} 
                                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none" 
                                placeholder="Pesan motivasi atau catatan evaluasi pembimbing tahfizh..."
                            />
                        </div>

                        <div className="text-[10px] text-teal-800 bg-white p-2 rounded-xl border border-teal-200 flex items-center justify-between">
                            <span>Pratinjau Titimangsa: <b>{batchTempatRapor}</b>, {formatTanggalDokumen(batchTanggalRapor, { formatMode: batchDateFormatMode, hijriAdjustment: settings.hijriAdjustment || 0, manualHijri: batchManualHijri })}</span>
                            <span className="font-bold">Total target: {targetSantriForPrint.length} santri</span>
                        </div>
                    </div>
                )}

                <div className="rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2">
                    <span>Filter Aktif: <strong className="text-gray-900">{filterLabel}</strong></span>
                    <span className="font-bold text-teal-800">
                        {batchReportType === 'rapor-semester' && `📘 ${targetSantriForPrint.length} Rapor Semesteran Siap Cetak`}
                        {batchReportType === 'perkembangan' && `📋 ${targetSantriForPrint.length} Laporan Mutaba'ah Siap Cetak`}
                        {batchReportType === 'ujian' && `📝 ${examRecords.length} Catatan Munaqosyah Siap Cetak`}
                        {batchReportType === 'syahadah' && `📜 ${targetSantriForPrint.length} Sertifikat Syahadah Siap Cetak`}
                        {batchReportType === 'rekap-rombel' && `📊 ${rombelSummaryData.length} Rombel / Kelas Siap Ekspor`}
                        {batchReportType === 'rekap-muhaffizh' && `👨‍🏫 ${muhaffizhSummaryData.length} Pembimbing Siap Ekspor`}
                    </span>
                </div>
            </div>

            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Data Tahfizh"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Halaqah</label>
                        <select 
                            value={halaqahId} 
                            onChange={e => setHalaqahId(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold bg-teal-50 text-teal-900"
                        >
                            <option value={0}>Semua Kelompok Halaqah</option>
                            {(settings.kelompokHalaqah || []).map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select 
                            value={jenjangId} 
                            onChange={e => { setJenjangId(Number(e.target.value)); setKelasId(0); setRombelId(0); }}
                            className="w-full border border-gray-300 rounded-xl p-3 text-xs font-bold"
                        >
                            <option value={0}>Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                        <select 
                            value={kelasId} 
                            onChange={e => { setKelasId(Number(e.target.value)); setRombelId(0); }}
                            disabled={!jenjangId}
                            className="w-full border border-gray-300 rounded-xl p-3 text-xs font-bold disabled:opacity-50"
                        >
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <select 
                        value={rombelId} 
                        onChange={e => setRombelId(Number(e.target.value))}
                        disabled={!kelasId}
                        className="w-full border border-gray-300 rounded-xl p-3 text-xs font-bold disabled:opacity-50"
                    >
                        <option value={0}>Semua Rombel</option>
                        {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                    </select>
                </div>
            </MobileFilterDrawer>

            {/* Grid List Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                {filteredSantri.map(santri => {
                    const latest = getLatestRecord(santri.id);
                    const totalSetoran = santriRecordsMap.get(santri.id)?.length || 0;
                    const mutqinCount = getMutqinJuzCount(santri.id);
                    const halaqahObj = (settings.kelompokHalaqah || []).find(h => h.id === santri.halaqahId);
                    
                    return (
                        <div key={santri.id} onClick={() => setSelectedSantri(santri)} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-400 transition-all cursor-pointer flex flex-col justify-between h-full group relative overflow-hidden">
                            {/* Accent Bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-200 group-hover:bg-teal-600 transition-colors"></div>
                            
                            <div className="flex items-start gap-3 pl-2">
                                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-lg shrink-0 overflow-hidden border border-teal-100 shadow-sm">
                                    {santri.fotoUrl && !santri.fotoUrl.includes('text=Foto') ? (
                                        <img src={santri.fotoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        santri.namaLengkap.charAt(0)
                                    )}
                                </div>
                                
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-800 truncate pr-2 text-sm sm:text-base leading-tight group-hover:text-teal-700 transition-colors">
                                                {santri.namaLengkap}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span className="text-[11px] text-gray-500 font-mono">NIS: {santri.nis}</span>
                                                {halaqahObj && (
                                                    <span className="text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded">
                                                        {halaqahObj.nama}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-center bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200 shrink-0">
                                            <span className="block text-sm font-bold text-teal-600 leading-none">{totalSetoran}</span>
                                            <span className="text-[8px] text-gray-400 uppercase tracking-wide">Setoran</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 pl-2 pt-3 border-t border-gray-100">
                                {latest ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                latest.tipe === 'Ziyadah'
                                                    ? 'bg-green-100 text-green-700'
                                                    : latest.tipe === 'Murojaah'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : latest.tipe === 'Ujian Hafalan'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-purple-100 text-purple-700'
                                            }`}>
                                                {latest.tipe}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {new Date(latest.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                                            Juz {latest.juz} • QS. {latest.surah}
                                        </p>
                                        <div className="flex justify-between items-center text-xs text-gray-500 mt-0.5">
                                            <span>Ayat {latest.ayatAwal}-{latest.ayatAkhir} • {latest.predikat}</span>
                                            {mutqinCount > 0 && (
                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                    {mutqinCount} Juz Mutqin
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-14 text-gray-400 text-xs italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        Belum ada riwayat hafalan
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredSantri.length === 0 && (
                <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                    <i className="bi bi-search text-4xl mb-3 block opacity-40"></i>
                    <p className="text-sm">Tidak ada data santri yang cocok dengan filter.</p>
                </div>
            )}

            {selectedSantri && (
                <TahfizhDetailModal 
                    isOpen={!!selectedSantri} 
                    onClose={() => setSelectedSantri(null)} 
                    santri={selectedSantri} 
                    records={santriRecordsMap.get(selectedSantri.id) || []} 
                />
            )}

            {/* Hidden Export & Print Area for Batch Document Types (Rendered only on-demand during export to maintain peak performance) */}
            {isExporting && (
                <div className="fixed left-[-100000px] top-0 w-[21cm] bg-white" aria-hidden="true">
                    {/* 1. Buku Rapor Semesteran Batch Report */}
                    {batchReportType === 'rapor-semester' && (
                        <div id="tahfizh-semester-batch-report">
                            {targetSantriForPrint.map((santri, index) => (
                                <div key={`rapor-santri-${santri.id}`}>
                                    <TahfizhSemesterRaporTemplate
                                        santri={santri}
                                        records={santriRecordsMap.get(santri.id) || []}
                                        settings={{
                                            ...settings,
                                            tanggalRaporDefault: batchTanggalRapor,
                                            tempatRaporDefault: batchTempatRapor
                                        }}
                                        semester={batchSemester}
                                        tahunAjaran={batchTahunAjaran}
                                        targetJuz={30}
                                        catatanMuhaffizh={batchDefaultCatatan}
                                        tanggalRapor={batchTanggalRapor}
                                        formatMode={batchDateFormatMode}
                                        manualHijri={batchManualHijri}
                                        petaMode={batchPetaMode}
                                        petaJuzStart={batchPetaJuzStart}
                                        petaJuzEnd={batchPetaJuzEnd}
                                        orangTuaMode={batchSignerMode}
                                        muhaffizhMode={batchSignerMode}
                                        mudirMode={batchSignerMode}
                                        pageBreakAfter={index < targetSantriForPrint.length - 1}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 2. Laporan Perkembangan Batch Report */}
                    {batchReportType === 'perkembangan' && (
                        <div id="tahfizh-progress-batch-report">
                            {targetSantriForPrint.map((santri, index) => (
                                <div key={`prog-santri-${santri.id}`}>
                                    <TahfizhReportTemplate
                                        santri={santri}
                                        records={santriRecordsMap.get(santri.id) || []}
                                        settings={settings}
                                        startDate={startDate}
                                        endDate={endDate}
                                        pageBreakAfter={index < targetSantriForPrint.length - 1}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. Rekap Ujian Hafalan Batch Report */}
                    {batchReportType === 'ujian' && (
                        <div id="tahfizh-exam-batch-report">
                            <TahfizhExamReportTemplate
                                records={examRecords}
                                santriList={filteredSantri}
                                settings={settings}
                                startDate={startDate}
                                endDate={endDate}
                                filterLabel={filterLabel}
                            />
                        </div>
                    )}

                    {/* 4. Syahadah Tahfizh Massal */}
                    {batchReportType === 'syahadah' && (
                        <div id="tahfizh-syahadah-batch-report" className="w-[29.7cm]">
                            {targetSantriForPrint.map((santri, index) => {
                                const records = santriRecordsMap.get(santri.id) || [];
                                const lastExam = records.find(r => r.tipe === 'Ujian Hafalan');
                                return (
                                    <div key={`syahadah-santri-${santri.id}`}>
                                        <TahfizhSyahadahTemplate
                                            santri={santri}
                                            record={lastExam}
                                            settings={settings}
                                            tanggal={batchTanggalRapor}
                                            formatMode={batchDateFormatMode}
                                            manualHijri={batchManualHijri}
                                            pageBreakAfter={index < targetSantriForPrint.length - 1}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 5. Rekapitulasi per Rombel */}
                    {batchReportType === 'rekap-rombel' && (
                        <div id="tahfizh-rombel-batch-report">
                            <TahfizhRombelRekapTemplate
                                data={rombelSummaryData}
                                settings={settings}
                                startDate={startDate}
                                endDate={endDate}
                                filterLabel={filterLabel}
                                tanggalRapor={batchTanggalRapor}
                                tempatRapor={batchTempatRapor}
                                dateFormatMode={batchDateFormatMode}
                                manualHijri={batchManualHijri}
                            />
                        </div>
                    )}

                    {/* 6. Rekapitulasi per Muhaffizh */}
                    {batchReportType === 'rekap-muhaffizh' && (
                        <div id="tahfizh-muhaffizh-batch-report">
                            <TahfizhMuhaffizhRekapTemplate
                                data={muhaffizhSummaryData}
                                settings={settings}
                                startDate={startDate}
                                endDate={endDate}
                                filterLabel={filterLabel}
                                tanggalRapor={batchTanggalRapor}
                                tempatRapor={batchTempatRapor}
                                dateFormatMode={batchDateFormatMode}
                                manualHijri={batchManualHijri}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

