import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { Santri, ArsipSurat } from '../../types';
import { db } from '../../db';
import { SuratPeringatanPrintTemplate, SuratPeringatanData } from './SuratPeringatanPrintTemplate';
import { printExportFacade } from '../../utils/printExportFacade';
import { AbsensiBkModal } from './AbsensiBkModal';

export const AbsensiSuratPeringatan: React.FC = () => {
    const { settings, showToast, currentUser } = useAppContext();
    const { santriList, absensiList } = useSantriContext();

    // Filters
    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(0);
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [filterRiskLevel, setFilterRiskLevel] = useState<'ALL' | 'SP1' | 'SP2' | 'SP3'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for Generating Letter
    const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
    const [selectedStudentForLetter, setSelectedStudentForLetter] = useState<Santri | null>(null);
    const [letterType, setLetterType] = useState<'SP1' | 'SP2' | 'SP3' | 'PANGGILAN_WALI'>('SP1');
    const [nomorSurat, setNomorSurat] = useState('');
    const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);
    const [tempatSurat, setTempatSurat] = useState(settings.alamat?.split(',')[0] || 'Pesantren');
    const [catatanTambahan, setCatatanTambahan] = useState('');

    // Preview zoom & scaling state
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);
    const [smartZoomScale, setSmartZoomScale] = useState<number>(1);
    const [manualZoom, setManualZoom] = useState<number>(1);
    const [fitToWidth, setFitToWidth] = useState<boolean>(true);
    const [isPrinting, setIsPrinting] = useState<boolean>(false);

    // Auto-calculate smart zoom
    const updateSmartZoom = useCallback(() => {
        if (!fitToWidth) {
            setSmartZoomScale(1);
            return;
        }
        if (previewContainerRef.current && contentWrapperRef.current) {
            const containerWidth = previewContainerRef.current.clientWidth - 32;
            const contentWidth = contentWrapperRef.current.scrollWidth || 794;
            if (contentWidth > 0 && containerWidth > 0) {
                const scale = Math.min(1.15, Math.max(0.3, containerWidth / contentWidth));
                setSmartZoomScale(scale);
            }
        }
    }, [fitToWidth]);

    useEffect(() => {
        if (!isLetterModalOpen) return;
        const timer = setTimeout(() => updateSmartZoom(), 100);
        window.addEventListener('resize', updateSmartZoom);
        
        let observer: ResizeObserver | null = null;
        if (previewContainerRef.current) {
            observer = new ResizeObserver(() => updateSmartZoom());
            observer.observe(previewContainerRef.current);
        }

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateSmartZoom);
            if (observer) observer.disconnect();
        };
    }, [updateSmartZoom, isLetterModalOpen, letterType]);

    // Panggilan Wali specifics
    const [panggilanHariTanggal, setPanggilanHariTanggal] = useState('');
    const [panggilanWaktu, setPanggilanWaktu] = useState('09.00 - 11.00');
    const [panggilanTempat, setPanggilanTempat] = useState('Ruang BP / BK Madrasah');
    const [panggilanMenghadap, setPanggilanMenghadap] = useState('Ustadz Pembina Asrama & Guru BK');

    // Signatories
    const [penandatanganNama, setPenandatanganNama] = useState('');
    const [penandatanganJabatan, setPenandatanganJabatan] = useState('Kepala Bagian Kedisiplinan');
    const [penandatanganNip, setPenandatanganNip] = useState('');
    const [mengetahuiNama, setMengetahuiNama] = useState(settings.mudirAamId ? settings.tenagaPengajar.find(t => t.id === settings.mudirAamId)?.nama || '' : '');
    const [mengetahuiJabatan, setMengetahuiJabatan] = useState('Mudir / Pimpinan Pondok');

    // BK Modal integration
    const [isBkModalOpen, setIsBkModalOpen] = useState(false);
    const [bkSantriId, setBkSantriId] = useState<number | null>(null);

    // Calculate at-risk students from full absensiList
    const atRiskData = useMemo(() => {
        const studentMap: Record<number, {
            santri: Santri;
            alphaCount: number;
            sakitCount: number;
            izinCount: number;
            hadirCount: number;
            totalDays: number;
            attendanceRate: number;
            alphaDates: { tanggal: string; keterangan?: string }[];
        }> = {};

        // Filter active santri
        santriList.forEach(s => {
            if (s.status === 'Aktif') {
                studentMap[s.id] = {
                    santri: s,
                    alphaCount: 0,
                    sakitCount: 0,
                    izinCount: 0,
                    hadirCount: 0,
                    totalDays: 0,
                    attendanceRate: 100,
                    alphaDates: []
                };
            }
        });

        // Tally up absensi
        absensiList.forEach(rec => {
            const entry = studentMap[rec.santriId];
            if (entry) {
                entry.totalDays += 1;
                if (rec.status === 'A') {
                    entry.alphaCount += 1;
                    entry.alphaDates.push({ tanggal: rec.tanggal, keterangan: rec.keterangan });
                } else if (rec.status === 'S') {
                    entry.sakitCount += 1;
                } else if (rec.status === 'I') {
                    entry.izinCount += 1;
                } else if (rec.status === 'H') {
                    entry.hadirCount += 1;
                }
            }
        });

        // Compute attendance rate and filter only those with at least 1 Alpha or total attendance < 90%
        const list = Object.values(studentMap).map(item => {
            const rate = item.totalDays > 0 ? (item.hadirCount / item.totalDays) * 100 : 100;
            return {
                ...item,
                attendanceRate: rate,
                alphaDates: item.alphaDates.sort((a, b) => b.tanggal.localeCompare(a.tanggal))
            };
        });

        return list;
    }, [santriList, absensiList]);

    // Filtered list according to UI selections
    const filteredAtRisk = useMemo(() => {
        return atRiskData.filter(item => {
            const { santri, alphaCount } = item;
            
            // By default, only show students with at least 1 Alpha or attendance rate below 85%
            if (alphaCount === 0 && item.attendanceRate >= 85) return false;

            if (selectedRombelId && santri.rombelId !== selectedRombelId) return false;

            if (selectedJenjangId) {
                const rombel = settings.rombel.find(r => r.id === santri.rombelId);
                const kelas = settings.kelas.find(k => k.id === rombel?.kelasId);
                if (kelas?.jenjangId !== selectedJenjangId) return false;
            }

            if (filterRiskLevel === 'SP1' && (alphaCount < 3 || alphaCount >= 5)) return false;
            if (filterRiskLevel === 'SP2' && (alphaCount < 5 || alphaCount >= 7)) return false;
            if (filterRiskLevel === 'SP3' && alphaCount < 7) return false;

            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                return santri.namaLengkap.toLowerCase().includes(q) || (santri.nis && santri.nis.toLowerCase().includes(q));
            }

            return true;
        }).sort((a, b) => b.alphaCount - a.alphaCount);
    }, [atRiskData, selectedRombelId, selectedJenjangId, filterRiskLevel, searchTerm, settings.rombel, settings.kelas]);

    // Statistics counts
    const sp1Count = useMemo(() => atRiskData.filter(i => i.alphaCount >= 3 && i.alphaCount < 5).length, [atRiskData]);
    const sp2Count = useMemo(() => atRiskData.filter(i => i.alphaCount >= 5 && i.alphaCount < 7).length, [atRiskData]);
    const sp3Count = useMemo(() => atRiskData.filter(i => i.alphaCount >= 7).length, [atRiskData]);

    const handleOpenLetterModal = (studentItem: typeof atRiskData[0], defaultType?: 'SP1' | 'SP2' | 'SP3' | 'PANGGILAN_WALI') => {
        setSelectedStudentForLetter(studentItem.santri);

        // Determine suggested letter type based on alpha count
        let suggestedType: 'SP1' | 'SP2' | 'SP3' | 'PANGGILAN_WALI' = defaultType || 'SP1';
        if (!defaultType) {
            if (studentItem.alphaCount >= 7) suggestedType = 'SP3';
            else if (studentItem.alphaCount >= 5) suggestedType = 'SP2';
            else suggestedType = 'SP1';
        }
        setLetterType(suggestedType);

        // Auto generate surat number
        const now = new Date();
        const monthRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()];
        const randomNum = String(Math.floor(10 + Math.random() * 90)).padStart(3, '0');
        setNomorSurat(`${randomNum}/PONTREN/${suggestedType}/${monthRomawi}/${now.getFullYear()}`);

        // Default default signers
        const waliKelasPengajar = studentItem.santri.rombelId 
            ? settings.tenagaPengajar.find(t => t.id === settings.rombel.find(r => r.id === studentItem.santri.rombelId)?.waliKelasId)
            : undefined;

        setPenandatanganNama(waliKelasPengajar?.nama || currentUser?.username || 'Ustadz Pembina Kedisiplinan');
        setPenandatanganJabatan(waliKelasPengajar ? 'Wali Kelas / Pengajar' : 'Kepala Bagian Kedisiplinan');
        
        // Panggilan defaults
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 3);
        setPanggilanHariTanggal(nextWeek.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

        setIsLetterModalOpen(true);
    };

    const handlePrintLetter = async () => {
        if (!activeLetterData) return;
        setIsPrinting(true);
        try {
            await printExportFacade.printDialog({
                elementId: 'surat-peringatan-print-area',
                fileName: `Surat_${letterType}_${selectedStudentForLetter?.namaLengkap || 'Santri'}`,
                paperSize: 'A4',
                target: 'report'
            });
        } catch {
            showToast('Gagal mencetak dokumen surat.', 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleDownloadWord = () => {
        if (!activeLetterData) return;
        try {
            printExportFacade.downloadWord({
                elementId: 'surat-peringatan-print-area',
                fileName: `Surat_${letterType}_${selectedStudentForLetter?.namaLengkap || 'Santri'}`,
                paperSize: 'A4',
                target: 'report'
            });
            showToast('Dokumen Word (.doc) berhasil diunduh.', 'success');
        } catch {
            showToast('Gagal mengunduh dokumen Word.', 'error');
        }
    };

    const [isArchiving, setIsArchiving] = useState<boolean>(false);

    const handleSaveToArsipSurat = async () => {
        if (!activeLetterData || !selectedStudentForLetter) return;
        setIsArchiving(true);
        try {
            const el = document.getElementById('surat-peringatan-print-area');
            const contentHtml = el ? el.innerHTML : '';
            const perihal = activeLetterData.tipe === 'PANGGILAN_WALI'
                ? 'Surat Panggilan Orang Tua / Wali Santri'
                : `Surat Peringatan ${activeLetterData.tipe.replace('SP', '')} (SP ${activeLetterData.tipe.replace('SP', '')})`;
            const newArsip: ArsipSurat = {
                id: Date.now(),
                nomorSurat: activeLetterData.nomorSurat,
                perihal,
                tujuan: `Wali Santri ${selectedStudentForLetter.namaLengkap} (NIS: ${selectedStudentForLetter.nis || '-'})`,
                isiSurat: contentHtml,
                tanggalBuat: activeLetterData.tanggalSurat,
                templateId: 0,
                tempatCetak: activeLetterData.tempatSurat,
                tanggalCetak: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                lastModified: Date.now()
            };
            await db.arsipSurat.put(newArsip);
            showToast('Alhamdulillah, surat berhasil disimpan ke Arsip Surat Resmi & siap disinkronkan ke Cloud!', 'success');
        } catch (err: any) {
            showToast('Gagal menyimpan ke arsip: ' + (err.message || 'Error'), 'error');
        } finally {
            setIsArchiving(false);
        }
    };

    const handleShareWaLetter = (studentItem: typeof atRiskData[0]) => {
        const { santri, alphaCount, sakitCount, izinCount, attendanceRate } = studentItem;
        const phone = santri.teleponWali || santri.telepon;
        if (!phone) {
            showToast('Nomor HP wali santri belum terdaftar di data profil.', 'info');
            return;
        }

        const rombel = settings.rombel.find(r => r.id === santri.rombelId);
        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');

        const message = `*PEMBERITAHUAN KEDISIPLINAN & PRESENSI SANTRI*
*${settings.namaPonpes || settings.namaYayasan || 'PONDOK PESANTREN'}*
----------------------------------------
Kepada Yth. 
*Bapak/Ibu Wali Santri dari : ${santri.namaLengkap}*
NIS: ${santri.nis || '-'}
Kelas: ${rombel?.nama || '-'}

_Assalamu'alaikum Warahmatullahi Wabarakatuh_

Kami memberitahukan perkembangan absensi ananda tercatat:
- *Alpha (Tanpa Keterangan)*: *${alphaCount} Hari*
- Sakit: ${sakitCount} Hari
- Izin: ${izinCount} Hari
- Tingkat Kehadiran: ${attendanceRate.toFixed(1)}%

${alphaCount >= 3 ? `Mohon bimbingan dan kerjasamanya agar ananda dapat meningkatkan kedisiplinan dan hadir tepat waktu dalam kegiatan belajar di pondok pesantren.` : ''}

_Wassalamu'alaikum Warahmatullahi Wabarakatuh_
*Bagian Kedisiplinan & Kesantrian*`;

        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    // Prepare letter data for template preview
    const activeLetterData: SuratPeringatanData | null = useMemo(() => {
        if (!selectedStudentForLetter) return null;
        const studentItem = atRiskData.find(i => i.santri.id === selectedStudentForLetter.id);
        const rombel = settings.rombel.find(r => r.id === selectedStudentForLetter.rombelId);
        const waliKelas = settings.tenagaPengajar.find(t => t.id === rombel?.waliKelasId);

        return {
            tipe: letterType,
            nomorSurat,
            tanggalSurat,
            tempatSurat,
            santri: selectedStudentForLetter,
            rombel,
            waliKelasName: waliKelas?.nama,
            totalAlpha: studentItem?.alphaCount || 0,
            totalSakit: studentItem?.sakitCount || 0,
            totalIzin: studentItem?.izinCount || 0,
            totalHari: studentItem?.totalDays || 0,
            attendanceRate: studentItem?.attendanceRate || 100,
            alphaDates: studentItem?.alphaDates || [],
            jadwalPanggilan: letterType === 'PANGGILAN_WALI' ? {
                hariTanggal: panggilanHariTanggal,
                waktu: panggilanWaktu,
                tempat: panggilanTempat,
                menghadap: panggilanMenghadap
            } : undefined,
            catatanTambahan,
            pejabatPenandatangan: {
                nama: penandatanganNama || 'Ustadz Pembina',
                jabatan: penandatanganJabatan || 'Kepala Bagian Kedisiplinan',
                nipNiy: penandatanganNip
            },
            mengetahui: mengetahuiNama ? {
                nama: mengetahuiNama,
                jabatan: mengetahuiJabatan
            } : undefined
        };
    }, [
        selectedStudentForLetter, atRiskData, settings.rombel, settings.tenagaPengajar,
        letterType, nomorSurat, tanggalSurat, tempatSurat, catatanTambahan,
        panggilanHariTanggal, panggilanWaktu, panggilanTempat, panggilanMenghadap,
        penandatanganNama, penandatanganJabatan, penandatanganNip, mengetahuiNama, mengetahuiJabatan
    ]);

    return (
        <div className="space-y-6">
            {/* Header Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                    onClick={() => setFilterRiskLevel('ALL')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterRiskLevel === 'ALL' ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase">Semua Perlu Pantauan</span>
                        <span className="p-2 rounded-xl bg-teal-100 text-teal-700 text-xs font-bold"><i className="bi bi-shield-exclamation"></i></span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 mt-2">{filteredAtRisk.length}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Santri dengan $\ge 1$ Alpha / Kehadiran $\le 85\%$</p>
                </div>

                <div 
                    onClick={() => setFilterRiskLevel('SP1')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterRiskLevel === 'SP1' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 uppercase">Peringatan I (SP-1)</span>
                        <span className="p-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold"><i className="bi bi-exclamation-triangle"></i></span>
                    </div>
                    <p className="text-2xl font-black text-amber-900 mt-2">{sp1Count}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Akumulasi 3 - 4 Hari Alpha</p>
                </div>

                <div 
                    onClick={() => setFilterRiskLevel('SP2')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterRiskLevel === 'SP2' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-700 uppercase">Peringatan II (SP-2)</span>
                        <span className="p-2 rounded-xl bg-orange-100 text-orange-800 text-xs font-bold"><i className="bi bi-exclamation-octagon"></i></span>
                    </div>
                    <p className="text-2xl font-black text-orange-900 mt-2">{sp2Count}</p>
                    <p className="text-[11px] text-orange-700 mt-0.5">Akumulasi 5 - 6 Hari Alpha</p>
                </div>

                <div 
                    onClick={() => setFilterRiskLevel('SP3')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterRiskLevel === 'SP3' ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-700 uppercase">SP-3 / Panggilan Wali</span>
                        <span className="p-2 rounded-xl bg-red-100 text-red-800 text-xs font-bold"><i className="bi bi-megaphone-fill"></i></span>
                    </div>
                    <p className="text-2xl font-black text-red-900 mt-2">{sp3Count}</p>
                    <p className="text-[11px] text-red-700 mt-0.5">Akumulasi $\ge 7$ Hari Alpha</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <select
                        value={selectedJenjangId}
                        onChange={e => {
                            setSelectedJenjangId(Number(e.target.value));
                            setSelectedRombelId(0);
                        }}
                        className="text-xs font-medium p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        <option value={0}>Semua Jenjang</option>
                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>

                    <select
                        value={selectedRombelId}
                        onChange={e => setSelectedRombelId(Number(e.target.value))}
                        className="text-xs font-medium p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        <option value={0}>Semua Rombel</option>
                        {settings.rombel
                            .filter(r => {
                                if (!selectedJenjangId) return true;
                                const k = settings.kelas.find(kl => kl.id === r.kelasId);
                                return k?.jenjangId === selectedJenjangId;
                            })
                            .map(r => <option key={r.id} value={r.id}>{r.nama}</option>)
                        }
                    </select>

                    <select
                        value={filterRiskLevel}
                        onChange={e => setFilterRiskLevel(e.target.value as any)}
                        className="text-xs font-medium p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        <option value="ALL">Semua Tingkat Alpha</option>
                        <option value="SP1">Kategori SP-1 (3-4 Alpha)</option>
                        <option value="SP2">Kategori SP-2 (5-6 Alpha)</option>
                        <option value="SP3">Kategori SP-3 (&ge; 7 Alpha)</option>
                    </select>
                </div>

                <div className="w-full md:w-64 relative">
                    <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        placeholder="Cari santri / NIS..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <i className="bi bi-person-lines-fill text-teal-600"></i>
                        <span>Daftar Santri Terdeteksi Perlu Pembinaan Disiplin ({filteredAtRisk.length})</span>
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                <th className="p-3 w-10 text-center">No</th>
                                <th className="p-3">Nama Santri & NIS</th>
                                <th className="p-3">Rombel & Wali Kelas</th>
                                <th className="p-3 text-center">Hadir</th>
                                <th className="p-3 text-center">Sakit</th>
                                <th className="p-3 text-center">Izin</th>
                                <th className="p-3 text-center">Alpha</th>
                                <th className="p-3 text-center">% Kehadiran</th>
                                <th className="p-3">Status Disiplin</th>
                                <th className="p-3 text-right">Aksi Dokumen & Notifikasi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAtRisk.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <i className="bi bi-shield-check text-4xl text-green-500"></i>
                                            <p className="font-bold text-gray-700 text-sm">Alhamdulillah, Tidak Ada Santri Berisiko Tinggi</p>
                                            <p className="text-xs text-gray-400">Seluruh santri memiliki catatan kehadiran yang baik pada filter yang dipilih.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAtRisk.map((item, idx) => {
                                    const { santri, alphaCount, sakitCount, izinCount, hadirCount, attendanceRate } = item;
                                    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
                                    const waliKelas = settings.tenagaPengajar.find(t => t.id === rombel?.waliKelasId);

                                    let badgeColor = 'bg-gray-100 text-gray-700 border-gray-300';
                                    let badgeLabel = 'Monitoring';
                                    if (alphaCount >= 7) {
                                        badgeColor = 'bg-red-100 text-red-800 border-red-300';
                                        badgeLabel = 'SP-3 / Panggilan';
                                    } else if (alphaCount >= 5) {
                                        badgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
                                        badgeLabel = 'SP-2 (Keras)';
                                    } else if (alphaCount >= 3) {
                                        badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                                        badgeLabel = 'SP-1 (Teguran)';
                                    }

                                    return (
                                        <tr key={santri.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                                            <td className="p-3">
                                                <p className="font-bold text-gray-900">{santri.namaLengkap}</p>
                                                <p className="text-[11px] text-gray-500">NIS: {santri.nis || '-'} • HP Wali: {santri.teleponWali || santri.telepon || '-'}</p>
                                            </td>
                                            <td className="p-3">
                                                <p className="font-semibold text-gray-800">{rombel?.nama || '-'}</p>
                                                <p className="text-[11px] text-gray-500">Wali: {waliKelas?.nama || '-'}</p>
                                            </td>
                                            <td className="p-3 text-center font-bold text-green-700">{hadirCount}</td>
                                            <td className="p-3 text-center font-bold text-yellow-700">{sakitCount}</td>
                                            <td className="p-3 text-center font-bold text-blue-700">{izinCount}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full font-black text-xs ${alphaCount >= 3 ? 'bg-red-500 text-white shadow-2xs' : 'text-red-700 bg-red-50'}`}>
                                                    {alphaCount}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`font-bold text-xs ${attendanceRate < 75 ? 'text-red-600' : attendanceRate < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                                    {attendanceRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeColor}`}>
                                                    {badgeLabel}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenLetterModal(item)}
                                                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                        title="Buat Surat SP / Panggilan Resmi"
                                                    >
                                                        <i className="bi bi-file-earmark-text-fill"></i>
                                                        <span className="hidden sm:inline">Surat SP</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleShareWaLetter(item)}
                                                        className="p-1.5 px-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                        title="Kirim Notifikasi Peringatan via WhatsApp"
                                                    >
                                                        <i className="bi bi-whatsapp"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setBkSantriId(santri.id);
                                                            setIsBkModalOpen(true);
                                                        }}
                                                        className="p-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                        title="Catat Sesi Konseling BK"
                                                    >
                                                        <i className="bi bi-person-heart"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: Generator Surat Peringatan / Panggilan Wali */}
            {isLetterModalOpen && activeLetterData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0">
                                    <i className="bi bi-file-earmark-text-fill text-lg"></i>
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                                        Dokumen Resmi Kedisiplinan
                                    </h2>
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        Santri: <strong className="text-gray-800">{selectedStudentForLetter?.namaLengkap}</strong> • NIS: {selectedStudentForLetter?.nis || '-'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsLetterModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                            >
                                <i className="bi bi-x-lg text-base"></i>
                            </button>
                        </div>

                        {/* Modal Body: Two Columns (Left Config, Right Smart Zoom Live Preview) */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
                            {/* Left Column: Form Settings (5 cols) */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">1. Jenis Surat</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLetterType('SP1');
                                                setNomorSurat(prev => prev.replace(/(SP[123]|PANGGILAN_WALI)/, 'SP1'));
                                            }}
                                            className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${letterType === 'SP1' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            SP-1 (Teguran)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLetterType('SP2');
                                                setNomorSurat(prev => prev.replace(/(SP[123]|PANGGILAN_WALI)/, 'SP2'));
                                            }}
                                            className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${letterType === 'SP2' ? 'bg-orange-500 text-white border-orange-500 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            SP-2 (Keras)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLetterType('SP3');
                                                setNomorSurat(prev => prev.replace(/(SP[123]|PANGGILAN_WALI)/, 'SP3'));
                                            }}
                                            className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${letterType === 'SP3' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            SP-3 (Terakhir)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLetterType('PANGGILAN_WALI');
                                                setNomorSurat(prev => prev.replace(/(SP[123]|PANGGILAN_WALI)/, 'PANGGILAN_WALI'));
                                            }}
                                            className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${letterType === 'PANGGILAN_WALI' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            Panggilan Wali
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">2. Nomor & Tempat Surat</h4>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nomor Surat</label>
                                        <input
                                            type="text"
                                            value={nomorSurat}
                                            onChange={e => setNomorSurat(e.target.value)}
                                            className="w-full text-xs font-semibold p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tempat</label>
                                            <input
                                                type="text"
                                                value={tempatSurat}
                                                onChange={e => setTempatSurat(e.target.value)}
                                                className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tanggal Surat</label>
                                            <input
                                                type="date"
                                                value={tanggalSurat}
                                                onChange={e => setTanggalSurat(e.target.value)}
                                                className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Catatan Khusus (Opsional)</label>
                                        <textarea
                                            rows={2}
                                            value={catatanTambahan}
                                            onChange={e => setCatatanTambahan(e.target.value)}
                                            placeholder="Tambahkan catatan khusus apabila diperlukan..."
                                            className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {letterType === 'PANGGILAN_WALI' && (
                                    <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 shadow-2xs space-y-3">
                                        <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">3. Jadwal Pemanggilan Wali</h4>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Hari & Tanggal</label>
                                            <input
                                                type="text"
                                                value={panggilanHariTanggal}
                                                onChange={e => setPanggilanHariTanggal(e.target.value)}
                                                className="w-full text-xs p-2 bg-white border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Waktu</label>
                                                <input
                                                    type="text"
                                                    value={panggilanWaktu}
                                                    onChange={e => setPanggilanWaktu(e.target.value)}
                                                    className="w-full text-xs p-2 bg-white border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Tempat</label>
                                                <input
                                                    type="text"
                                                    value={panggilanTempat}
                                                    onChange={e => setPanggilanTempat(e.target.value)}
                                                    className="w-full text-xs p-2 bg-white border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-indigo-800 mb-1">Menghadap Ke</label>
                                            <input
                                                type="text"
                                                value={panggilanMenghadap}
                                                onChange={e => setPanggilanMenghadap(e.target.value)}
                                                className="w-full text-xs p-2 bg-white border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{letterType === 'PANGGILAN_WALI' ? '4' : '3'}. Legalitas & Penandatangan</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nama Pejabat</label>
                                            <input
                                                type="text"
                                                value={penandatanganNama}
                                                onChange={e => setPenandatanganNama(e.target.value)}
                                                className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Jabatan</label>
                                            <input
                                                type="text"
                                                value={penandatanganJabatan}
                                                onChange={e => setPenandatanganJabatan(e.target.value)}
                                                className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Mengetahui (Pimpinan / Mudir)</label>
                                        <input
                                            type="text"
                                            value={mengetahuiNama}
                                            onChange={e => setMengetahuiNama(e.target.value)}
                                            placeholder="Nama Mudir / Pimpinan"
                                            className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Live Sheet Preview (7 cols) */}
                            <div className="lg:col-span-7 space-y-3 flex flex-col">
                                {/* Preview Controls Bar (Automatic Zoom & Actions) */}
                                <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                                    {/* Zoom Controls */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFitToWidth(false);
                                                setManualZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(2))));
                                            }}
                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                            title="Zoom Out"
                                        >
                                            <i className="bi bi-zoom-out"></i>
                                        </button>
                                        <span className="px-2 text-xs font-mono font-bold text-gray-700 min-w-[50px] text-center">
                                            {Math.round(smartZoomScale * manualZoom * 100)}%
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFitToWidth(false);
                                                setManualZoom(z => Math.min(2.0, Number((z + 0.1).toFixed(2))));
                                            }}
                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                            title="Zoom In"
                                        >
                                            <i className="bi bi-zoom-in"></i>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFitToWidth(true);
                                                setManualZoom(1);
                                                updateSmartZoom();
                                            }}
                                            className={`ml-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${fitToWidth ? 'bg-teal-50 text-teal-700 border-teal-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                            title="Sesuaikan dengan Lebar Layar"
                                        >
                                            <i className="bi bi-arrows-angle-expand mr-1"></i> Auto Fit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFitToWidth(false);
                                                setManualZoom(1);
                                                setSmartZoomScale(1);
                                            }}
                                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                                            title="Ukuran Asli 100%"
                                        >
                                            100%
                                        </button>
                                    </div>

                                    {/* Action Buttons in Toolbar */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleDownloadWord}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                            title="Unduh file dokumen Word (.doc)"
                                        >
                                            <i className="bi bi-file-earmark-word text-blue-600"></i>
                                            <span>Word (.doc)</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isPrinting}
                                            onClick={handlePrintLetter}
                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                            title="Cetak atau Simpan PDF"
                                        >
                                            <i className="bi bi-printer-fill"></i>
                                            <span>Cetak / PDF</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Viewport with Automatic Scaling */}
                                <div 
                                    ref={previewContainerRef}
                                    className="flex-1 bg-slate-200/80 rounded-2xl border border-gray-300 p-4 sm:p-6 overflow-auto min-h-[480px] max-h-[64vh] flex justify-center items-start shadow-inner custom-scrollbar"
                                >
                                    <div 
                                        ref={contentWrapperRef}
                                        style={{ 
                                            transform: `scale(${smartZoomScale * manualZoom})`,
                                            transformOrigin: 'top center',
                                            transition: 'transform 0.15s ease-out'
                                        }}
                                        className="shadow-xl rounded-sm bg-white"
                                    >
                                        <SuratPeringatanPrintTemplate settings={settings} data={activeLetterData} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex justify-between items-center shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsLetterModalOpen(false)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                                Tutup
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isArchiving}
                                    onClick={handleSaveToArsipSurat}
                                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                    title="Simpan surat ke modul Arsip Surat resmi & Cloud"
                                >
                                    <i className={`bi ${isArchiving ? 'bi-arrow-repeat animate-spin' : 'bi-archive-fill'} text-amber-700`}></i>
                                    <span>{isArchiving ? 'Menyimpan...' : 'Simpan ke Arsip'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadWord}
                                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <i className="bi bi-file-earmark-word text-blue-600 text-sm"></i>
                                    <span>Unduh Word (.doc)</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={isPrinting}
                                    onClick={handlePrintLetter}
                                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <i className={`bi ${isPrinting ? 'bi-arrow-repeat animate-spin' : 'bi-printer-fill'}`}></i>
                                    <span>{isPrinting ? 'Menyiapkan Dokumen...' : 'Cetak Dokumen Sekarang'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BK Modal */}
            <AbsensiBkModal
                isOpen={isBkModalOpen}
                onClose={() => {
                    setIsBkModalOpen(false);
                    setBkSantriId(null);
                }}
                santri={bkSantriId ? santriList.find(s => s.id === bkSantriId) || null : null}
                alasanRujukan="Rujukan Kedisiplinan: Ketidakhadiran & Alpha berulang"
            />
        </div>
    );
};
