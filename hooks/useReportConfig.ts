import { useState, useMemo, useCallback } from 'react';
import { ReportType, Santri } from '../types';

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

export const useReportConfig = (filteredSantri: Santri[], santriList: Santri[]) => {
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
    const [labelWidth, setLabelWidth] = useState<number>(6);
    const [labelHeight, setLabelHeight] = useState<number>(3);
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
    const [cardTheme, setCardTheme] = useState<string>(predefinedCardThemes['Biru']);
    const [cardValidUntil, setCardValidUntil] = useState<string>('2028-07-31');
    const [cardFields, setCardFields] = useState<string[]>(['foto', 'namaLengkap', 'nis', 'jenjang', 'rombel', 'ttl', 'ayahWali']);
    const [cardPrintMode, setCardPrintMode] = useState<'all' | 'selected'>('all');
    const [selectedCardSantriIds, setSelectedCardSantriIds] = useState<number[]>([]);
    const [cardSignatoryTitle, setCardSignatoryTitle] = useState<string>('Mudir Marhalah');
    const [cardSignatoryId, setCardSignatoryId] = useState<string>('');
    const [agendaKedatangan, setAgendaKedatangan] = useState<string>('');
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [tahunAjaran, setTahunAjaran] = useState<string>('1446/1447 H');
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
        setCardTheme(predefinedCardThemes['Biru']);
        setCardSignatoryTitle('Mudir Marhalah');
        setCardSignatoryId('');
        setUseHijriDate(false);
        setHijriDateMode('auto');
        setManualHijriDate('');
        setAgendaKedatangan('');
        setSemester('Ganjil');
        setTahunAjaran('1446/1447 H');
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
    }, []);

    const canGenerate = useMemo(() => {
        if (!activeReport) return false;
        if (activeReport !== ReportType.LaporanMutasi && activeReport !== ReportType.LaporanAsrama && !isFinancialReport && filteredSantri.length === 0) return false;
        if ((activeReport === ReportType.LaporanMutasi || activeReport === ReportType.LaporanAsrama || activeReport === ReportType.LaporanArusKas) && santriList.length === 0) return false;

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
            case ReportType.LaporanArusKas:
                return true;
            case ReportType.LaporanAsrama:
                return true;
            default:
                return true;
        }
    }, [activeReport, santriList.length, filteredSantri.length, biodataPrintMode, selectedBiodataSantriIds, pembinaanPrintMode, selectedPembinaanSantriIds, cardPrintMode, selectedCardSantriIds, labelPrintMode, selectedLabelSantriIds, selectedMapelIds, izinPrintMode, selectedIzinSantriIds, rekeningKoranPrintMode, selectedRekeningKoranSantriIds, isFinancialReport]);

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
            cardTheme, setCardTheme,
            cardValidUntil, setCardValidUntil,
            cardFields, setCardFields,
            cardPrintMode, setCardPrintMode,
            selectedCardSantriIds, setSelectedCardSantriIds,
            cardSignatoryTitle, setCardSignatoryTitle,
            cardSignatoryId, setCardSignatoryId,
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
        }
    };
};