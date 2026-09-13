
import { useState, useMemo, useCallback } from 'react';
import { ReportType, Santri } from '../types';
import { deriveAcademicYearLabel } from '../utils/academicYear';

const defaultIzinKetentuan = "1. Formulir ini wajib dibawa dan disimpan oleh santri selama masa izin.\n" +
    "2. Santri wajib kembali ke pondok tepat pada waktu yang telah ditentukan.\n" +
    "3. Keterlambatan kembali tanpa udzur syar'i akan dikenakan sanksi sesuai peraturan yang berlaku.\n" +
    "4. Selama di luar pondok, santri wajib menjaga nama baik diri, keluarga, dan almamater.\n" +
    "5. Formulir ini harus diserahkan kembali kepada Bagian Keamanan saat tiba di pondok.";

const predefinedCardThemes = {
    'Biru': '#1e40af',
    'Hijau': '#065f46',
    'Abu-abu': '#374151',
};

export const useReportConfig = (
    filteredSantri: Santri[],
    santriList: Santri[],
    defaultAcademicYear: string = deriveAcademicYearLabel()
) => {
    const [activeReport, setActiveReport] = useState<ReportType | null>(null);
    const [paperSize, setPaperSize] = useState('A4');
    const [margin, setMargin] = useState('normal');
    const [selectedMapelIds, setSelectedMapelIds] = useState<number[]>([]);
    const [guidanceOption, setGuidanceOption] = useState<'show' | 'hide'>('show');
    const [attendanceCalendar, setAttendanceCalendar] = useState<'Masehi' | 'Hijriah'>('Masehi');
    const [startMonth, setStartMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [endMonth, setEndMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [hijriStartMonth, setHijriStartMonth] = useState<number>(1);
    const [hijriStartYear, setHijriStartYear] = useState<number>(1446);
    const [hijriEndMonth, setHijriEndMonth] = useState<number>(1);
    const [hijriEndYear, setHijriEndYear] = useState<number>(1446);
    const [labelWidth, setLabelWidth] = useState<number>(6.4);
    const [labelHeight, setLabelHeight] = useState<number>(3.2);
    const [labelFontSize, setLabelFontSize] = useState<number>(10);
    const [labelFields, setLabelFields] = useState<string[]>(['namaLengkap', 'nis', 'rombel']);
    const [labelPrintMode, setLabelPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedLabelSantriIds, setSelectedLabelSantriIds] = useState<number[]>([]);
    const [biodataPrintMode, setBiodataPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedBiodataSantriIds, setSelectedBiodataSantriIds] = useState<number[]>([]);
    const [useHijriDate, setUseHijriDate] = useState<boolean>(false);
    const [hijriDateMode, setHijriDateMode] = useState<'auto' | 'manual'>('auto');
    const [manualHijriDate, setManualHijriDate] = useState<string>('');
    const [pembinaanPrintMode, setPembinaanPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedPembinaanSantriIds, setSelectedPembinaanSantriIds] = useState<number[]>([]);
    const [mutasiStartDate, setMutasiStartDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [mutasiEndDate, setMutasiEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    // Card Configs
    const [cardDesign, setCardDesign] = useState<string>('classic'); // 'classic', 'modern', 'vertical', 'dark', 'ceria'
    const [cardTheme, setCardTheme] = useState<string>(predefinedCardThemes['Biru']);
    const [cardValidityMode, setCardValidityMode] = useState<'date' | 'forever' | 'none'>('date');
    const [cardValidUntil, setCardValidUntil] = useState<string>('2028-07-31');
    const [cardFields, setCardFields] = useState<string[]>(['foto', 'namaLengkap', 'nis', 'jenjang', 'kelas', 'rombel', 'ttl', 'alamat', 'ayahWali']);
    const [cardWidth, setCardWidth] = useState<number>(8.56);
    const [cardHeight, setCardHeight] = useState<number>(5.398);
    const [cardBacksideLayout, setCardBacksideLayout] = useState<'none' | 'side-by-side' | 'separate'>('side-by-side');
    const [cardPrintMode, setCardPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedCardSantriIds, setSelectedCardSantriIds] = useState<number[]>([]);
    const [cardSignatoryTitle, setCardSignatoryTitle] = useState<string>('Mudir Marhalah');
    const [cardSignatoryId, setCardSignatoryId] = useState<string>('');
    const [cardShowQRCode, setCardShowQRCode] = useState<boolean>(false);
    const [cardQRCodeType, setCardQRCodeType] = useState<'qr' | 'barcode' | 'both'>('qr');
    const [cardQRPlacement, setCardQRPlacement] = useState<'replace_photo' | 'with_photo'>('with_photo');
    const [cardRulesFontSize, setCardRulesFontSize] = useState<'auto' | 'small' | 'normal' | 'large'>('auto');
    const [cardRulesCustomColor, setCardRulesCustomColor] = useState<string>('');
    const [cardShowQuote, setCardShowQuote] = useState<boolean>(true);
    const [cardCustomQuote, setCardCustomQuote] = useState<string>('');
    
    const defaultCardRules = `Kartu ini adalah tanda pengenal resmi santri {NamaPonpes}.
Santri wajib membawa kartu ini selama berada di lingkungan pesantren atau saat mengikuti kegiatan resmi.
Kartu ini tidak boleh dipindahtangankan kepada orang lain.
Apabila kartu ini hilang atau rusak, santri wajib segera melapor kepada pengurus kesantrian untuk proses penggantian.
Kartu ini berlaku sebagai akses (jika terintegrasi) untuk peminjaman perpustakaan, layanan kesehatan, dan transaksi koperasi.`;

    const [cardRules, setCardRules] = useState<string>(defaultCardRules);
    const [agendaKedatangan, setAgendaKedatangan] = useState<string>('');
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [tahunAjaran, setTahunAjaran] = useState<string>(defaultAcademicYear);
    const [izinTujuan, setIzinTujuan] = useState<string>('');
    const [izinKeperluan, setIzinKeperluan] = useState<string>('');
    const [izinTanggalBerangkat, setIzinTanggalBerangkat] = useState<string>(new Date().toISOString().split('T')[0]);
    const [izinTanggalKembali, setIzinTanggalKembali] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split('T')[0];
    });
    const [izinPenjemput, setIzinPenjemput] = useState<string>('');
    const [izinPrintMode, setIzinPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedIzinSantriIds, setSelectedIzinSantriIds] = useState<number[]>([]);
    const [izinSignatoryTitle, setIzinSignatoryTitle] = useState<string>('Bag. Keamanan');
    const [izinSignatoryId, setIzinSignatoryId] = useState<string>('');
    const [izinKetentuan, setIzinKetentuan] = useState<string>(defaultIzinKetentuan);
    const [kasStartDate, setKasStartDate] = useState<string>(mutasiStartDate);
    const [kasEndDate, setKasEndDate] = useState<string>(mutasiEndDate);
    const [rekeningKoranStartDate, setRekeningKoranStartDate] = useState<string>(mutasiStartDate);
    const [rekeningKoranEndDate, setRekeningKoranEndDate] = useState<string>(mutasiEndDate);
    const [rekeningKoranPrintMode, setRekeningKoranPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedRekeningKoranSantriIds, setSelectedRekeningKoranSantriIds] = useState<number[]>([]);
    const [nilaiTpCount, setNilaiTpCount] = useState<number>(4);
    const [nilaiSmCount, setNilaiSmCount] = useState<number>(2);
    const [showNilaiTengahSemester, setShowNilaiTengahSemester] = useState<boolean>(true);
    const [jurnalTanggalFilter, setJurnalTanggalFilter] = useState<string>(new Date().toISOString().split('T')[0]);
    const [jurnalEndDate, setJurnalEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [jurnalMapelFilter, setJurnalMapelFilter] = useState<number | null>(null);
    const [nilaiGuruFilter, setNilaiGuruFilter] = useState<number | null>(null);
    const [kesehatanStartDate, setKesehatanStartDate] = useState<string>(mutasiStartDate);
    const [kesehatanEndDate, setKesehatanEndDate] = useState<string>(mutasiEndDate);
    const [bkStartDate, setBkStartDate] = useState<string>(mutasiStartDate);
    const [bkEndDate, setBkEndDate] = useState<string>(mutasiEndDate);
    const [rombelVisibleColumns, setRombelVisibleColumns] = useState<string[]>([
        'no', 'nis', 'namaLengkap', 'lp', 'ttl', 'wali', 'telepon', 'alamat'
    ]);
    const [rombelTitle, setRombelTitle] = useState<string>('DAFTAR SANTRI');
    const [rombelGrouping, setRombelGrouping] = useState<'rombel' | 'kelas' | 'jenjang' | 'jenisSantri' | 'none'>('rombel');
    const [showRombelStats, setShowRombelStats] = useState<boolean>(true);
    const [rombelShowSignatures, setRombelShowSignatures] = useState<boolean>(true);
    const [rombelSignatory1Title, setRombelSignatory1Title] = useState<string>('Wali Kelas');
    const [rombelSignatory1Id, setRombelSignatory1Id] = useState<string>('');
    const [rombelSignatory2Title, setRombelSignatory2Title] = useState<string>('Kepala Madrasah / Mudir');
    const [rombelSignatory2Id, setRombelSignatory2Id] = useState<string>('');
    const [rombelOrientation, setRombelOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
    const [tahfizhStartDate, setTahfizhStartDate] = useState<string>(mutasiStartDate);
    const [tahfizhEndDate, setTahfizhEndDate] = useState<string>(mutasiEndDate);
    const [tahfizhTipeFilter, setTahfizhTipeFilter] = useState<string[]>(['Ziyadah', 'Murojaah', "Tasmi'", 'Ujian Hafalan']);

    // Watermark Settings (Universal for printed documents/reports)
    const [showWatermark, setShowWatermark] = useState<boolean>(false);
    const [watermarkText, setWatermarkText] = useState<string>('ASLI');
    const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.12);
    const [watermarkColor, setWatermarkColor] = useState<string>('#4b5563');
    const [watermarkFontSize, setWatermarkFontSize] = useState<number>(44);

    // --- 1. Surat Keterangan Santri Aktif ---
    const [suratAktifPrintMode, setSuratAktifPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedSuratAktifSantriIds, setSelectedSuratAktifSantriIds] = useState<number[]>([]);
    const [suratAktifNoSurat, setSuratAktifNoSurat] = useState<string>('');
    const [suratAktifKeperluan, setSuratAktifKeperluan] = useState<string>('Pengajuan Tunjangan Gaji Orang Tua (PNS/TNI/POLRI/BUMN)');
    const [suratAktifSignatoryTitle, setSuratAktifSignatoryTitle] = useState<string>('Kepala Madrasah / Mudir');
    const [suratAktifSignatoryId, setSuratAktifSignatoryId] = useState<string>('');
    const [suratAktifTanggal, setSuratAktifTanggal] = useState<string>(new Date().toISOString().split('T')[0]);

    // --- 2. Surat Keterangan Berkelakuan Baik ---
    const [suratBaikPrintMode, setSuratBaikPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedSuratBaikSantriIds, setSelectedSuratBaikSantriIds] = useState<number[]>([]);
    const [suratBaikNoSurat, setSuratBaikNoSurat] = useState<string>('');
    const [suratBaikKeperluan, setSuratBaikKeperluan] = useState<string>('Kelengkapan Pendaftaran Masuk Perguruan Tinggi / Beasiswa');
    const [suratBaikSignatoryTitle, setSuratBaikSignatoryTitle] = useState<string>('Kepala Bagian Pengasuhan / Mudir');
    const [suratBaikSignatoryId, setSuratBaikSignatoryId] = useState<string>('');
    const [suratBaikTanggal, setSuratBaikTanggal] = useState<string>(new Date().toISOString().split('T')[0]);

    // --- 3. Buku Induk Santri ---
    const [bukuIndukPrintMode, setBukuIndukPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedBukuIndukSantriIds, setSelectedBukuIndukSantriIds] = useState<number[]>([]);
    const [bukuIndukSignatoryTitle, setBukuIndukSignatoryTitle] = useState<string>('Kepala Madrasah / Staf Tata Usaha');
    const [bukuIndukSignatoryId, setBukuIndukSignatoryId] = useState<string>('');

    // --- 4. Matriks Tunggakan SPP Rombel ---
    const [matriksTahunAjaran, setMatriksTahunAjaran] = useState<string>(defaultAcademicYear);
    const [matriksSignatory1Title, setMatriksSignatory1Title] = useState<string>('Wali Kelas');
    const [matriksSignatory1Id, setMatriksSignatory1Id] = useState<string>('');
    const [matriksSignatory2Title, setMatriksSignatory2Title] = useState<string>('Bendahara Pesantren');
    const [matriksSignatory2Id, setMatriksSignatory2Id] = useState<string>('');

    // --- 5. Syahadah Tahfizh ---
    const [syahadahPrintMode, setSyahadahPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedSyahadahSantriIds, setSelectedSyahadahSantriIds] = useState<number[]>([]);
    const [syahadahTheme, setSyahadahTheme] = useState<'emerald' | 'gold' | 'royal_blue' | 'monochrome' | 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria'>('emerald');
    const [syahadahJenis, setSyahadahJenis] = useState<string>("30 Juz (Khatam Bil-Ghaib)");
    const [syahadahPredikat, setSyahadahPredikat] = useState<string>("Mumtaz (Sangat Baik Sekali)");
    const [syahadahNomor, setSyahadahNomor] = useState<string>('');
    const [syahadahTanggal, setSyahadahTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
    const [syahadahFormatMode, setSyahadahFormatMode] = useState<'masehi' | 'hijriah_masehi' | 'hijriah'>('masehi');
    const [syahadahManualHijri, setSyahadahManualHijri] = useState<string>("15 Sya'ban 1446 H");
    const [syahadahMuhaffizhName, setSyahadahMuhaffizhName] = useState<string>('');
    const [syahadahLabelTop, setSyahadahLabelTop] = useState<string>('Mengetahui,');
    const [syahadahRoleBottom, setSyahadahRoleBottom] = useState<string>('Musyrif / Penguji Tahfizh');
    const [syahadahSignatory1Title, setSyahadahSignatory1Title] = useState<string>('Musyrif / Penguji Tahfizh');
    const [syahadahSignatory1Id, setSyahadahSignatory1Id] = useState<string>('');
    const [syahadahSignatory2Title, setSyahadahSignatory2Title] = useState<string>('Pengasuh Pondok Pesantren');
    const [syahadahSignatory2Id, setSyahadahSignatory2Id] = useState<string>('');
    const [syahadahRasm, setSyahadahRasm] = useState<string>("Riwayat Hafsh 'an 'Ashim Thariq Asy-Syathibiyyah");

    const isFinancialReport = activeReport === ReportType.LaporanArusKas || activeReport === ReportType.RekeningKoranSantri;


    const resetReportSpecificState = useCallback(() => {
        setSelectedMapelIds([]);
        setLabelPrintMode('all');
        setSelectedLabelSantriIds([]);
        setBiodataPrintMode('all');
        setSelectedBiodataSantriIds([]);
        setCardPrintMode('all');
        setSelectedCardSantriIds([]);
        setPembinaanPrintMode('all');
        setSelectedPembinaanSantriIds([]);
        setCardDesign('classic');
        setCardTheme(predefinedCardThemes['Biru']);
        setCardValidityMode('date');
        setCardSignatoryTitle('Mudir Marhalah');
        setCardSignatoryId('');
        setCardShowQRCode(false);
        setCardQRCodeType('qr');
        setCardRulesFontSize('auto');
        setCardRulesCustomColor('');
        setUseHijriDate(false);
        setHijriDateMode('auto');
        setManualHijriDate('');
        setAgendaKedatangan('');
        setSemester('Ganjil');
        setTahunAjaran(defaultAcademicYear);
        setIzinPrintMode('all');
        setSelectedIzinSantriIds([]);
        setIzinTujuan('');
        setIzinKeperluan('');
        setIzinPenjemput('');
        setIzinSignatoryTitle('Bag. Keamanan');
        setIzinSignatoryId('');
        setIzinKetentuan(defaultIzinKetentuan);
        setRekeningKoranPrintMode('all');
        setSelectedRekeningKoranSantriIds([]);
        setNilaiTpCount(4);
        setNilaiSmCount(2);
        setShowNilaiTengahSemester(true);
        setGuidanceOption('show');
        setJurnalEndDate(new Date().toISOString().split('T')[0]);
        setJurnalMapelFilter(null);
        setNilaiGuruFilter(null);
        setCardFields(['foto', 'namaLengkap', 'nis', 'jenjang', 'rombel', 'ttl', 'alamat', 'ayahWali']);
        setCardWidth(8.56);
        setCardHeight(5.398);
        setLabelWidth(6.4);
        setLabelHeight(3.2);
        setLabelFontSize(10);
        setRombelVisibleColumns(['no', 'nis', 'namaLengkap', 'lp', 'ttl', 'wali', 'telepon', 'alamat']);
        setRombelTitle('DAFTAR SANTRI');
        setRombelGrouping('rombel');
        setShowRombelStats(true);
        setRombelShowSignatures(true);
        setRombelSignatory1Title('Wali Kelas');
        setRombelSignatory1Id('');
        setRombelSignatory2Title('Kepala Madrasah / Mudir');
        setRombelSignatory2Id('');
        setRombelOrientation('auto');
    }, [defaultAcademicYear]);

    const canGenerate = useMemo(() => {
        if (!activeReport) return false;
        
        const reportsWithoutSantriRequirement = [
            ReportType.OperasionalHarian,
            ReportType.KinerjaPengajar,
            ReportType.EfektivitasPSB,
            ReportType.LaporanArusKas,
            ReportType.DaftarWaliKelas,
            ReportType.LaporanMapel,
            ReportType.LaporanKontakStaf,
        ];

        const needsFilteredSantri = ![
            ReportType.LaporanMutasi,
            ReportType.LaporanAsrama,
            ...reportsWithoutSantriRequirement
        ].includes(activeReport) && !isFinancialReport;

        if (needsFilteredSantri && filteredSantri.length === 0) return false;
        if ((activeReport === ReportType.LaporanMutasi || activeReport === ReportType.LaporanAsrama) && santriList.length === 0) return false;

        switch(activeReport) {
            case ReportType.Biodata:
                return biodataPrintMode === 'all' || (biodataPrintMode === 'selected' && selectedBiodataSantriIds.length > 0);
            case ReportType.LembarPembinaan:
                return pembinaanPrintMode === 'all' || (pembinaanPrintMode === 'selected' && selectedPembinaanSantriIds.length > 0);
            case ReportType.LembarNilai:
                return selectedMapelIds.length > 0;
            case ReportType.LabelSantri:
                return labelPrintMode === 'all' || (labelPrintMode === 'selected' && selectedLabelSantriIds.length > 0);
            case ReportType.KartuSantri:
                return cardPrintMode === 'all' || (cardPrintMode === 'selected' && selectedCardSantriIds.length > 0);
            case ReportType.FormulirIzin:
                return izinPrintMode === 'all' || (izinPrintMode === 'selected' && selectedIzinSantriIds.length > 0);
            case ReportType.RekeningKoranSantri:
                 return rekeningKoranPrintMode === 'all' || (rekeningKoranPrintMode === 'selected' && selectedRekeningKoranSantriIds.length > 0);
            case ReportType.BukuIndukSantri:
                return bukuIndukPrintMode === 'all' || (bukuIndukPrintMode === 'selected' && selectedBukuIndukSantriIds.length > 0);
            case ReportType.MatriksTunggakanSPP:
                return true;
            case ReportType.LaporanArusKas:
                return true;
            case ReportType.LaporanAsrama:
                return true;
            case ReportType.LaporanKontak:
                return true;
            default:
                return true;
        }
    }, [activeReport, santriList.length, filteredSantri.length, biodataPrintMode, selectedBiodataSantriIds, pembinaanPrintMode, selectedPembinaanSantriIds, cardPrintMode, selectedCardSantriIds, labelPrintMode, selectedMapelIds, izinPrintMode, selectedIzinSantriIds, rekeningKoranPrintMode, selectedRekeningKoranSantriIds, bukuIndukPrintMode, selectedBukuIndukSantriIds, isFinancialReport]);

    return {
        activeReport, setActiveReport,
        paperSize, setPaperSize,
        margin, setMargin,
        canGenerate,
        resetReportSpecificState,
        options: {
            selectedMapelIds, setSelectedMapelIds,
            guidanceOption, setGuidanceOption,
            attendanceCalendar, setAttendanceCalendar,
            startMonth, setStartMonth,
            endMonth, setEndMonth,
            hijriStartMonth, setHijriStartMonth,
            hijriStartYear, setHijriStartYear,
            hijriEndMonth, setHijriEndMonth,
            hijriEndYear, setHijriEndYear,
            labelWidth, setLabelWidth,
            labelHeight, setLabelHeight,
            labelFontSize, setLabelFontSize,
            labelFields, setLabelFields,
            labelPrintMode, setLabelPrintMode,
            selectedLabelSantriIds, setSelectedLabelSantriIds,
            biodataPrintMode, setBiodataPrintMode,
            selectedBiodataSantriIds, setSelectedBiodataSantriIds,
            useHijriDate, setUseHijriDate,
            hijriDateMode, setHijriDateMode,
            manualHijriDate, setManualHijriDate,
            pembinaanPrintMode, setPembinaanPrintMode,
            selectedPembinaanSantriIds, setSelectedPembinaanSantriIds,
            mutasiStartDate, setMutasiStartDate,
            mutasiEndDate, setMutasiEndDate,
            cardDesign, setCardDesign,
            cardTheme, setCardTheme,
            cardValidityMode, setCardValidityMode,
            cardValidUntil, setCardValidUntil,
            cardFields, setCardFields,
            cardWidth, setCardWidth,
            cardHeight, setCardHeight,
            cardBacksideLayout, setCardBacksideLayout,
            cardRules, setCardRules,
            cardRulesFontSize, setCardRulesFontSize,
            cardRulesCustomColor, setCardRulesCustomColor,
            cardShowQuote, setCardShowQuote,
            cardCustomQuote, setCardCustomQuote,
            cardPrintMode, setCardPrintMode,
            selectedCardSantriIds, setSelectedCardSantriIds,
            cardSignatoryTitle, setCardSignatoryTitle,
            cardSignatoryId, setCardSignatoryId,
            cardShowQRCode, setCardShowQRCode,
            cardQRCodeType, setCardQRCodeType,
            cardQRPlacement, setCardQRPlacement,
            agendaKedatangan, setAgendaKedatangan,
            semester, setSemester,
            tahunAjaran, setTahunAjaran,
            izinTujuan, setIzinTujuan,
            izinKeperluan, setIzinKeperluan,
            izinTanggalBerangkat, setIzinTanggalBerangkat,
            izinTanggalKembali, setIzinTanggalKembali,
            izinPenjemput, setIzinPenjemput,
            izinPrintMode, setIzinPrintMode,
            selectedIzinSantriIds, setSelectedIzinSantriIds,
            izinSignatoryTitle, setIzinSignatoryTitle,
            izinSignatoryId, setIzinSignatoryId,
            izinKetentuan, setIzinKetentuan,
            predefinedCardThemes,
            kasStartDate, setKasStartDate,
            kasEndDate, setKasEndDate,
            rekeningKoranStartDate, setRekeningKoranStartDate,
            rekeningKoranEndDate, setRekeningKoranEndDate,
            rekeningKoranPrintMode, setRekeningKoranPrintMode,
            selectedRekeningKoranSantriIds, setSelectedRekeningKoranSantriIds,
            nilaiTpCount, setNilaiTpCount,
            nilaiSmCount, setNilaiSmCount,
            showNilaiTengahSemester, setShowNilaiTengahSemester,
            jurnalTanggalFilter, setJurnalTanggalFilter,
            jurnalEndDate, setJurnalEndDate,
            jurnalMapelFilter, setJurnalMapelFilter,
            nilaiGuruFilter, setNilaiGuruFilter,
            kesehatanStartDate, setKesehatanStartDate,
            kesehatanEndDate, setKesehatanEndDate,
            bkStartDate, setBkStartDate,
            bkEndDate, setBkEndDate,
            rombelVisibleColumns, setRombelVisibleColumns,
            rombelTitle, setRombelTitle,
            rombelGrouping, setRombelGrouping,
            showRombelStats, setShowRombelStats,
            rombelShowSignatures, setRombelShowSignatures,
            rombelSignatory1Title, setRombelSignatory1Title,
            rombelSignatory1Id, setRombelSignatory1Id,
            rombelSignatory2Title, setRombelSignatory2Title,
            rombelSignatory2Id, setRombelSignatory2Id,
            rombelOrientation, setRombelOrientation,
            tahfizhStartDate, setTahfizhStartDate,
            tahfizhEndDate, setTahfizhEndDate,
            tahfizhTipeFilter, setTahfizhTipeFilter,
            showWatermark, setShowWatermark,
            watermarkText, setWatermarkText,
            watermarkOpacity, setWatermarkOpacity,
            watermarkColor, setWatermarkColor,
            watermarkFontSize, setWatermarkFontSize,
            // 1. Surat Keterangan Aktif
            suratAktifPrintMode, setSuratAktifPrintMode,
            selectedSuratAktifSantriIds, setSelectedSuratAktifSantriIds,
            suratAktifNoSurat, setSuratAktifNoSurat,
            suratAktifKeperluan, setSuratAktifKeperluan,
            suratAktifSignatoryTitle, setSuratAktifSignatoryTitle,
            suratAktifSignatoryId, setSuratAktifSignatoryId,
            suratAktifTanggal, setSuratAktifTanggal,
            // 2. Surat Keterangan Berkelakuan Baik
            suratBaikPrintMode, setSuratBaikPrintMode,
            selectedSuratBaikSantriIds, setSelectedSuratBaikSantriIds,
            suratBaikNoSurat, setSuratBaikNoSurat,
            suratBaikKeperluan, setSuratBaikKeperluan,
            suratBaikSignatoryTitle, setSuratBaikSignatoryTitle,
            suratBaikSignatoryId, setSuratBaikSignatoryId,
            suratBaikTanggal, setSuratBaikTanggal,
            // 3. Buku Induk Santri
            bukuIndukPrintMode, setBukuIndukPrintMode,
            selectedBukuIndukSantriIds, setSelectedBukuIndukSantriIds,
            bukuIndukSignatoryTitle, setBukuIndukSignatoryTitle,
            bukuIndukSignatoryId, setBukuIndukSignatoryId,
            // 4. Matriks Tunggakan SPP Rombel
            matriksTahunAjaran, setMatriksTahunAjaran,
            matriksSignatory1Title, setMatriksSignatory1Title,
            matriksSignatory1Id, setMatriksSignatory1Id,
            matriksSignatory2Title, setMatriksSignatory2Title,
            matriksSignatory2Id, setMatriksSignatory2Id,
            // 5. Syahadah Tahfizh
            syahadahPrintMode, setSyahadahPrintMode,
            selectedSyahadahSantriIds, setSelectedSyahadahSantriIds,
            syahadahTheme, setSyahadahTheme,
            syahadahJenis, setSyahadahJenis,
            syahadahPredikat, setSyahadahPredikat,
            syahadahNomor, setSyahadahNomor,
            syahadahTanggal, setSyahadahTanggal,
            syahadahFormatMode, setSyahadahFormatMode,
            syahadahManualHijri, setSyahadahManualHijri,
            syahadahMuhaffizhName, setSyahadahMuhaffizhName,
            syahadahLabelTop, setSyahadahLabelTop,
            syahadahRoleBottom, setSyahadahRoleBottom,
            syahadahSignatory1Title, setSyahadahSignatory1Title,
            syahadahSignatory1Id, setSyahadahSignatory1Id,
            syahadahSignatory2Title, setSyahadahSignatory2Title,
            syahadahSignatory2Id, setSyahadahSignatory2Id,
            syahadahRasm, setSyahadahRasm,
        }
    };
};
