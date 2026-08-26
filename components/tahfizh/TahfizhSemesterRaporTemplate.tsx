import React, { useMemo } from 'react';
import { Santri, TahfizhRecord, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { formatDate, ReportFooter } from '../reports/modules/Common';
import { formatTanggalDokumen, DateFormatMode } from '../../utils/formatters';
import { QURAN_JUZ_DATA, getSurahsInJuzRange } from '../../data/quran';
import { getSurahEvaluationSummary, getJuzEvaluationSummary, getScorePredikat } from '../../utils/tahfizhScoring';

export type SignerMode = 'auto' | 'manual' | 'dots';

interface TahfizhSemesterRaporTemplateProps {
    santri: Santri;
    records: TahfizhRecord[];
    settings: PondokSettings;
    semester?: 'Ganjil' | 'Genap';
    tahunAjaran?: string;
    targetJuz?: number;
    catatanMuhaffizh?: string;
    
    // Orang Tua / Wali Customization
    orangTuaMode?: SignerMode;
    orangTuaName?: string;
    orangTuaLabel?: string;
    
    // Muhaffizh / Pembimbing Customization
    muhaffizhMode?: SignerMode;
    muhaffizhName?: string;
    muhaffizhLabel?: string;
    
    // Mudir / Pimpinan Pondok Customization
    mudirMode?: SignerMode;
    mudirName?: string;
    mudirJabatan?: string;
    
    tanggalRapor?: string;
    formatMode?: DateFormatMode;
    manualHijri?: string;
    petaMode?: 'grid30' | 'perSurah';
    petaJuzStart?: number;
    petaJuzEnd?: number;
    petaJuzTarget?: number;
    pageBreakAfter?: boolean;
}

export const TahfizhSemesterRaporTemplateComponent: React.FC<TahfizhSemesterRaporTemplateProps> = ({
    santri,
    records,
    settings,
    semester = 'Ganjil',
    tahunAjaran = '2026/2027',
    targetJuz = 30,
    catatanMuhaffizh = "Alhamdulillah ananda menunjukkan kesungguhan dan adab yang baik dalam halaqah tahfizh. Mohon terus didampingi muraja'ah di rumah.",
    
    orangTuaMode = 'auto',
    orangTuaName,
    orangTuaLabel,
    
    muhaffizhMode = 'auto',
    muhaffizhName,
    muhaffizhLabel,
    
    mudirMode = 'auto',
    mudirName,
    mudirJabatan,
    
    tanggalRapor,
    formatMode,
    manualHijri,
    petaMode = 'grid30',
    petaJuzStart,
    petaJuzEnd,
    petaJuzTarget = 30,
    pageBreakAfter = false,
}) => {
    // 1. Halaqah & Pembimbing / Muhaffizh Lookup (Auto-link)
    const halaqah = useMemo(() => settings.kelompokHalaqah?.find(h => h.id === santri.halaqahId || h.santriIds?.includes(santri.id)), [settings.kelompokHalaqah, santri.halaqahId, santri.id]);
    const teacherFromHalaqah = useMemo(() => halaqah?.muhaffizhId 
        ? settings.tenagaPengajar?.find(t => t.id === halaqah.muhaffizhId) 
        : null, [halaqah, settings.tenagaPengajar]);

    const rombel = useMemo(() => settings.rombel?.find(r => r.id === santri.rombelId), [settings.rombel, santri.rombelId]);
    const kelas = useMemo(() => settings.kelas?.find(k => k.id === santri.kelasId), [settings.kelas, santri.kelasId]);
    const jenjang = useMemo(() => settings.jenjang?.find(j => j.id === santri.jenjangId), [settings.jenjang, santri.jenjangId]);
    const teacherFromRombel = useMemo(() => rombel?.waliKelasId ? settings.tenagaPengajar?.find(t => t.id === rombel.waliKelasId) : null, [rombel, settings.tenagaPengajar]);

    const teacherResolved = teacherFromHalaqah || teacherFromRombel;
    
    // Resolve Final Muhaffizh Signature
    let finalMuhaffizhName = '...................................';
    let finalMuhaffizhLabel = muhaffizhLabel || (halaqah?.nama ? `Pembimbing ${halaqah.nama}` : 'Pembimbing Halaqah');
    
    if (muhaffizhMode === 'dots') {
        finalMuhaffizhName = '...................................';
    } else if (muhaffizhMode === 'manual') {
        finalMuhaffizhName = muhaffizhName?.trim() || '...................................';
        if (muhaffizhLabel) finalMuhaffizhLabel = muhaffizhLabel;
    } else {
        finalMuhaffizhName = muhaffizhName?.trim() || teacherResolved?.nama || 'Ustadz Pembimbing';
    }

    // 2. Orang Tua / Wali Signature Resolve
    let finalOrangTuaName = '...................................';
    let finalOrangTuaLabel = orangTuaLabel || (santri.namaWali?.trim() 
        ? 'Wali Santri' 
        : (santri.namaAyah?.trim() 
            ? 'Ayah Kandung' 
            : (santri.namaIbu?.trim() 
                ? 'Ibu Kandung' 
                : 'Orang Tua / Wali Santri')));

    if (orangTuaMode === 'dots') {
        finalOrangTuaName = '...................................';
    } else if (orangTuaMode === 'manual') {
        finalOrangTuaName = orangTuaName?.trim() || '...................................';
        if (orangTuaLabel) finalOrangTuaLabel = orangTuaLabel;
    } else {
        finalOrangTuaName = orangTuaName?.trim() 
            || santri.namaWali?.trim() 
            || santri.namaAyah?.trim() 
            || santri.namaIbu?.trim() 
            || '...................................';
    }

    // 3. Mudir / Pengasuh Pondok Lookup (Auto-link from Settings)
    const mudirTeacher = useMemo(() => (settings.mudirAamId ? settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId) : null)
        || (jenjang?.mudirId ? settings.tenagaPengajar?.find(t => t.id === jenjang.mudirId) : null)
        || settings.tenagaPengajar?.find(t => t.riwayatJabatan?.some(r => 
            r.jabatan.toLowerCase().includes('mudir') || 
            r.jabatan.toLowerCase().includes('pengasuh') || 
            r.jabatan.toLowerCase().includes('pimpinan') || 
            r.jabatan.toLowerCase().includes('kepala')
        ))
        || settings.tenagaPengajar?.[0], [settings.mudirAamId, settings.tenagaPengajar, jenjang?.mudirId]);

    const activeJabatan = mudirTeacher?.riwayatJabatan?.find(r => !r.tanggalSelesai)?.jabatan;
    const rawJabatan = (mudirJabatan?.trim() || activeJabatan || '').toLowerCase();
    const isGenericTeacher = rawJabatan.includes('guru') || rawJabatan.includes('pengajar') || rawJabatan === 'asatidz';

    let finalMudirJabatan = (mudirJabatan?.trim() && !isGenericTeacher)
        ? mudirJabatan.trim()
        : (activeJabatan && !isGenericTeacher)
            ? activeJabatan
            : 'Pimpinan Pondok Pesantren';

    let finalMudirName = '...................................';

    if (mudirMode === 'dots') {
        finalMudirName = '...................................';
        if (mudirJabatan) finalMudirJabatan = mudirJabatan;
    } else if (mudirMode === 'manual') {
        finalMudirName = mudirName?.trim() || '...................................';
        if (mudirJabatan) finalMudirJabatan = mudirJabatan;
    } else {
        finalMudirName = mudirName?.trim() 
            || mudirTeacher?.nama 
            || (settings.namaPonpes ? `Mudir ${settings.namaPonpes}` : 'Pimpinan Pondok Pesantren');
    }

    const tempatPenetapan = settings.tempatRaporDefault?.trim() || settings.alamat?.split(',')[1]?.trim() || settings.alamat?.split(',')[0]?.trim() || 'Pondok';
    const finalTanggalRapor = tanggalRapor || settings.tanggalRaporDefault || new Date().toISOString();
    const activeFormatMode = formatMode || settings.formatTanggalRaporDefault || 'masehi';
    const activeManualHijri = manualHijri || settings.manualHijriRaporDefault || '';
    const tanggalDisplay = formatTanggalDokumen(finalTanggalRapor, {
        formatMode: activeFormatMode,
        hijriAdjustment: settings.hijriAdjustment || 0,
        manualHijri: activeManualHijri
    });

    // Records breakdown (memoized)
    const { ziyadahRecords, murojaahRecords, examRecords, mutqinJuzSet, ziyadahJuzSet, avgScore, predikatText, totalTeguran, totalKesalahan, totalTajwid, totalMakhraj } = useMemo(() => {
        const ziyadah: TahfizhRecord[] = [];
        const murojaah: TahfizhRecord[] = [];
        const exams: TahfizhRecord[] = [];
        const mutqinSet = new Set<number>();
        const ziyadahSet = new Set<number>();
        let teguranCount = 0;
        let kesalahanCount = 0;
        let tajwidCount = 0;
        let makhrajCount = 0;

        records.forEach(r => {
            if (r.tipe === 'Ziyadah') {
                ziyadah.push(r);
                if (r.juz) ziyadahSet.add(r.juz);
            } else if (r.tipe === 'Murojaah' || r.tipe === "Tasmi'") {
                murojaah.push(r);
            } else if (r.tipe === 'Ujian Hafalan') {
                exams.push(r);
                if (r.predikat !== 'Belum Lulus' && r.juz) {
                    mutqinSet.add(r.juz);
                }
            }

            teguranCount += (r.jumlahTeguran || 0);
            kesalahanCount += (r.jumlahKesalahan || 0);
            if (r.kategoriKesalahan?.tajwid) tajwidCount += r.kategoriKesalahan.tajwid;
            if (r.kategoriKesalahan?.makhraj) makhrajCount += r.kategoriKesalahan.makhraj;
        });

        // Calculate Average Scores
        const examsWithScores = exams.filter(r => typeof r.nilaiAngka === 'number');
        const calculatedAvg = examsWithScores.length > 0
            ? Math.round(examsWithScores.reduce((sum, r) => sum + (r.nilaiAngka || 0), 0) / examsWithScores.length)
            : (records.some(r => r.predikat === 'Sangat Lancar') ? 92 : 84);

        let pred = 'Jayyid Jiddan (Amat Baik)';
        if (calculatedAvg >= 90) pred = 'Mumtaz (Istimewa)';
        else if (calculatedAvg >= 80) pred = 'Jayyid Jiddan (Amat Baik)';
        else if (calculatedAvg >= 70) pred = 'Jayyid (Baik)';
        else pred = 'Maqbul (Cukup)';

        return {
            ziyadahRecords: ziyadah,
            murojaahRecords: murojaah,
            examRecords: exams,
            mutqinJuzSet: mutqinSet,
            ziyadahJuzSet: ziyadahSet,
            avgScore: calculatedAvg,
            predikatText: pred,
            totalTeguran: teguranCount,
            totalKesalahan: kesalahanCount,
            totalTajwid: tajwidCount,
            totalMakhraj: makhrajCount
        };
    }, [records]);

    // Per-Surah Target & Range Calculation (memoized)
    const effectiveStartJuz = petaJuzStart ?? petaJuzTarget ?? (targetJuz <= 30 ? targetJuz : 30);
    const effectiveEndJuz = petaJuzEnd ?? effectiveStartJuz;
    const minJuz = Math.min(effectiveStartJuz, effectiveEndJuz);
    const maxJuz = Math.max(effectiveStartJuz, effectiveEndJuz);
    const isSingleJuz = minJuz === maxJuz;

    const surahsInTarget = useMemo(() => getSurahsInJuzRange(minJuz, maxJuz), [minJuz, maxJuz]);

    // Memoized Surah Summaries for Section C (only computed when in perSurah mode)
    const surahColumns = useMemo(() => {
        if (petaMode !== 'perSurah') return [];
        const surahSummaries = surahsInTarget.map(s => getSurahEvaluationSummary(s.number, records));
        const surahColSize = Math.ceil(surahSummaries.length / 3);
        return [
            surahSummaries.slice(0, surahColSize),
            surahSummaries.slice(surahColSize, surahColSize * 2),
            surahSummaries.slice(surahColSize * 2)
        ];
    }, [petaMode, surahsInTarget, records]);

    // Memoized 30 Juz Summaries for Section C (only computed when in grid30 mode)
    const juzColumns = useMemo(() => {
        if (petaMode === 'perSurah') return [];
        const juzSummaries = Array.from({ length: 30 }, (_, i) => getJuzEvaluationSummary(i + 1, records));
        return [
            { title: 'Juz 1 - 10', items: juzSummaries.slice(0, 10) },
            { title: 'Juz 11 - 20', items: juzSummaries.slice(10, 20) },
            { title: 'Juz 21 - 30', items: juzSummaries.slice(20, 30) }
        ];
    }, [petaMode, records]);

    return (
        <div 
            className={`font-sans text-black p-6 sm:p-7 bg-white flex flex-col justify-between printable-content-wrapper print-portrait ${pageBreakAfter ? 'page-break-after' : ''}`}
            style={{ width: '21cm', minHeight: '29.7cm' }}
        >
            <div>
                <PrintHeader settings={settings} title="RAPOR MUTABA'AH TAHFIZHUL QUR'AN" compact />

                {/* Subheader Semester & Tahun */}
                <div className="text-center -mt-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest bg-gray-100 px-4 py-1 rounded-full border border-gray-300">
                        Semester {semester} • Tahun Ajaran {tahunAjaran}
                    </span>
                </div>

                {/* Identitas Santri Table (Ringkas tanpa duplikasi wali/pembimbing/mudir) */}
                <table className="w-full text-xs border border-gray-400 mb-3 bg-gray-50/50">
                    <tbody>
                        <tr>
                            <td className="w-28 p-1.5 font-bold border-b border-r border-gray-300">Nama Santri</td>
                            <td className="w-3 p-1.5 border-b border-gray-300">:</td>
                            <td className="p-1.5 font-bold text-gray-900 border-b border-r border-gray-300">{santri.namaLengkap}</td>
                            <td className="w-28 p-1.5 font-bold border-b border-r border-gray-300">Kelompok Halaqah</td>
                            <td className="w-3 p-1.5 border-b border-gray-300">:</td>
                            <td className="p-1.5 font-semibold text-gray-900 border-b border-gray-300">{halaqah?.nama || 'Halaqah Tahfizh'}</td>
                        </tr>
                        <tr>
                            <td className="p-1.5 font-bold border-r border-gray-300">NIS / NISN</td>
                            <td className="p-1.5">:</td>
                            <td className="p-1.5 border-r border-gray-300 text-gray-800">{santri.nis || '-'} {santri.nisn ? `(${santri.nisn})` : ''}</td>
                            <td className="p-1.5 font-bold border-r border-gray-300">Kelas / Target</td>
                            <td className="p-1.5">:</td>
                            <td className="p-1.5 text-gray-800">
                                {jenjang?.nama || '-'} {kelas?.nama ? `- ${kelas.nama}` : ''} {rombel?.nama ? `(${rombel.nama})` : ''} <span className="font-bold text-teal-800 ml-1.5">• Target: Juz {targetJuz}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Ringkasan Capaian Hafalan */}
                <div className="mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-800">
                        A. RINGKASAN CAPAIAN HAFALAN & AKTIVITAS MUTABA'AH
                    </h4>
                    <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                        <div className="border border-gray-400 p-1.5 rounded bg-gray-50">
                            <span className="text-[9.5px] text-gray-600 block uppercase font-semibold">Total Setoran</span>
                            <span className="text-sm font-black text-gray-900">{records.length} Sesi</span>
                        </div>
                        <div className="border border-gray-400 p-1.5 rounded bg-gray-50">
                            <span className="text-[9.5px] text-gray-600 block uppercase font-semibold">Target Hafalan</span>
                            <span className="text-sm font-black text-teal-800">Juz {targetJuz}</span>
                        </div>
                        <div className="border border-gray-400 p-1.5 rounded bg-gray-50">
                            <span className="text-[9.5px] text-gray-600 block uppercase font-semibold">Ziyadah Aktif</span>
                            <span className="text-sm font-black text-teal-700">{ziyadahJuzSet.size} Juz</span>
                        </div>
                        <div className="border border-gray-400 p-1.5 rounded bg-gray-50">
                            <span className="text-[9.5px] text-gray-600 block uppercase font-semibold">Juz Mutqin</span>
                            <span className="text-sm font-black text-emerald-700">{mutqinJuzSet.size} Juz</span>
                        </div>
                        <div className="border border-gray-400 p-1.5 rounded bg-gray-50">
                            <span className="text-[9.5px] text-gray-600 block uppercase font-semibold">Rata-Rata Nilai</span>
                            <span className="text-sm font-black text-gray-900">{avgScore} ({predikatText.split(' ')[0]})</span>
                        </div>
                    </div>
                </div>

                {/* Tabel Aspek Penilaian Kualitatif */}
                <div className="mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-800">
                        B. ASPEK PENILAIAN KOMPETENSI TAHFIZH
                    </h4>
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-gray-100 font-bold text-center">
                                <th className="border border-black p-1.5 w-8">No</th>
                                <th className="border border-black p-1.5 text-left">Aspek Penilaian</th>
                                <th className="border border-black p-1.5 w-20">Nilai (0-100)</th>
                                <th className="border border-black p-1.5 w-28">Predikat</th>
                                <th className="border border-black p-1.5 text-left">Deskripsi & Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-1.5 text-center font-bold">1</td>
                                <td className="border border-black p-1.5 font-bold">Kelancaran & Al-Itqan</td>
                                <td className="border border-black p-1.5 text-center font-bold">{avgScore}</td>
                                <td className="border border-black p-1.5 text-center font-semibold">{predikatText}</td>
                                <td className="border border-black p-1.5 text-[11px]">
                                    Kemampuan menyambung ayat dan ketahanan hafalan dalam mutaba'ah halaqah.
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1.5 text-center font-bold">2</td>
                                <td className="border border-black p-1.5 font-bold">Tajwid & Ahkamul Madd</td>
                                <td className="border border-black p-1.5 text-center font-bold">{Math.min(100, avgScore + 1)}</td>
                                <td className="border border-black p-1.5 text-center font-semibold">Amat Baik</td>
                                <td className="border border-black p-1.5 text-[11px]">
                                    Penerapan ghunnah, hukum nun/mim sukun, mad thabi'i dan mad far'i.
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1.5 text-center font-bold">3</td>
                                <td className="border border-black p-1.5 font-bold">Fashahah & Makhraj</td>
                                <td className="border border-black p-1.5 text-center font-bold">{Math.max(65, avgScore - 2)}</td>
                                <td className="border border-black p-1.5 text-center font-semibold">Baik</td>
                                <td className="border border-black p-1.5 text-[11px]">
                                    Ketepatan makharijul huruf, sifat huruf, serta waqaf dan ibtida'.
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1.5 text-center font-bold">4</td>
                                <td className="border border-black p-1.5 font-bold">Adab & Kedisiplinan</td>
                                <td className="border border-black p-1.5 text-center font-bold">95</td>
                                <td className="border border-black p-1.5 text-center font-semibold">Mumtaz</td>
                                <td className="border border-black p-1.5 text-[11px]">
                                    Kedisiplinan hadir di halaqah, adab terhadap mushaf dan ustadz pembimbing.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Section C: Tabel 3 Kolom Evaluasi Detail Hafalan (Mode Surat atau Mode 30 Juz) */}
                {petaMode === 'perSurah' ? (
                    <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                {isSingleJuz 
                                    ? `C. DAFTAR EVALUASI SURAT (JUZ ${minJuz} • ${surahsInTarget.length} SURAT)`
                                    : `C. DAFTAR EVALUASI SURAT (JUZ ${minJuz} s/d JUZ ${maxJuz} • ${surahsInTarget.length} SURAT)`
                                }
                            </h4>
                            <div className="text-[10px] text-gray-600 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-600 inline-block"></span> Mutqin
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-teal-400 inline-block"></span> Ziyadah
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-gray-200 inline-block"></span> Belum
                                </span>
                            </div>
                        </div>

                        {/* Tabel 3 Kolom Dibagi Rata */}
                        <div className="grid grid-cols-3 gap-2">
                            {surahColumns.map((colSurahs, colIdx) => (
                                <table key={colIdx} className="w-full border-collapse border border-black text-[9px]">
                                    <thead>
                                        <tr className="bg-gray-100 font-bold text-center border-b border-black">
                                            <th className="border-r border-black p-0.5 text-left">Nama Surat</th>
                                            <th className="border-r border-black p-0.5 w-6 text-center" title="Jumlah Teguran">Teg</th>
                                            <th className="border-r border-black p-0.5 w-6 text-center" title="Jumlah Salah">Slh</th>
                                            <th className="border-r border-black p-0.5 w-7 text-center" title="Nilai Angka">Nilai</th>
                                            <th className="p-0.5 w-7 text-center" title="Predikat Capaian">Pred</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {colSurahs.map((sSummary) => {
                                            const statusBadge = sSummary.status === 'Mutqin'
                                                ? <span className="text-[7px] bg-emerald-100 text-emerald-800 font-bold px-0.5 rounded ml-0.5">M</span>
                                                : sSummary.status === 'Ziyadah'
                                                ? <span className="text-[7px] bg-teal-100 text-teal-800 font-semibold px-0.5 rounded ml-0.5">Z</span>
                                                : null;

                                            const predInfo = sSummary.nilai !== null ? getScorePredikat(sSummary.nilai) : null;

                                            return (
                                                <tr key={sSummary.surahNumber} className="border-b border-gray-300">
                                                    <td className="border-r border-black p-0.5 font-medium truncate max-w-[80px]">
                                                        {sSummary.surahNumber}. {sSummary.surahName}
                                                        {statusBadge}
                                                    </td>
                                                    <td className="border-r border-black p-0.5 text-center font-mono text-[8.5px]">
                                                        {sSummary.hasRecord ? sSummary.totalTeguran : '-'}
                                                    </td>
                                                    <td className="border-r border-black p-0.5 text-center font-mono text-[8.5px]">
                                                        {sSummary.hasRecord ? sSummary.totalKesalahan : '-'}
                                                    </td>
                                                    <td className="border-r border-black p-0.5 text-center font-bold font-mono text-gray-900 text-[8.5px]">
                                                        {sSummary.nilai !== null ? sSummary.nilai : '-'}
                                                    </td>
                                                    <td className="p-0.5 text-center">
                                                        {predInfo ? (
                                                            <span className="text-[7px] font-bold text-teal-900 bg-teal-50 px-1 py-0.2 rounded border border-teal-200 inline-block leading-none">
                                                                {predInfo.predikatShort}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {colSurahs.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-2 text-center text-gray-400 italic text-[9px]">-</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                C. DAFTAR EVALUASI 30 JUZ AL-QUR'AN
                            </h4>
                            <div className="text-[10px] text-gray-600 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-600 inline-block"></span> Mutqin
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-teal-400 inline-block"></span> Ziyadah
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-gray-200 inline-block"></span> Belum
                                </span>
                            </div>
                        </div>

                        {/* Tabel 3 Kolom: Kiri (Juz 1-10), Tengah (Juz 11-20), Kanan (Juz 21-30) */}
                        <div className="grid grid-cols-3 gap-2">
                            {juzColumns.map((col, colIdx) => (
                                <table key={colIdx} className="w-full border-collapse border border-black text-[9px]">
                                    <thead>
                                        <tr className="bg-gray-100 font-bold text-center border-b border-black">
                                            <th className="border-r border-black p-0.5 text-left">Nama Juz</th>
                                            <th className="border-r border-black p-0.5 w-6 text-center" title="Jumlah Teguran">Teg</th>
                                            <th className="border-r border-black p-0.5 w-6 text-center" title="Jumlah Salah">Slh</th>
                                            <th className="border-r border-black p-0.5 w-7 text-center" title="Nilai Angka">Nilai</th>
                                            <th className="p-0.5 w-7 text-center" title="Predikat Capaian">Pred</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {col.items.map((jSummary) => {
                                            const statusBadge = jSummary.status === 'Mutqin'
                                                ? <span className="text-[7px] bg-emerald-100 text-emerald-800 font-bold px-0.5 rounded ml-0.5">M</span>
                                                : jSummary.status === 'Ziyadah'
                                                ? <span className="text-[7px] bg-teal-100 text-teal-800 font-semibold px-0.5 rounded ml-0.5">Z</span>
                                                : null;

                                            const predInfo = jSummary.nilai !== null ? getScorePredikat(jSummary.nilai) : null;

                                            return (
                                                <tr key={jSummary.juz} className="border-b border-gray-300">
                                                    <td className="border-r border-black p-0.5 font-semibold">
                                                        Juz {jSummary.juz} {jSummary.juz === 30 ? "('Amma)" : jSummary.juz === 29 ? "(Tabarak)" : ""}
                                                        {statusBadge}
                                                    </td>
                                                    <td className="border-r border-black p-0.5 text-center font-mono text-[8.5px]">
                                                        {jSummary.hasRecord ? jSummary.totalTeguran : '-'}
                                                    </td>
                                                    <td className="border-r border-black p-0.5 text-center font-mono text-[8.5px]">
                                                        {jSummary.hasRecord ? jSummary.totalKesalahan : '-'}
                                                    </td>
                                                    <td className="border-r border-black p-0.5 text-center font-bold font-mono text-gray-900 text-[8.5px]">
                                                        {jSummary.nilai !== null ? jSummary.nilai : '-'}
                                                    </td>
                                                    <td className="p-0.5 text-center">
                                                        {predInfo ? (
                                                            <span className="text-[7px] font-bold text-teal-900 bg-teal-50 px-1 py-0.2 rounded border border-teal-200 inline-block leading-none">
                                                                {predInfo.predikatShort}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ))}
                        </div>
                    </div>
                )}

                {/* Catatan & Evaluasi Muhaffizh (Font Dinamis Max 2 Baris) */}
                {(() => {
                    const cleanCatatan = (catatanMuhaffizh || '').trim();
                    const textLength = cleanCatatan.length;
                    const dynamicFontClass = textLength > 190
                        ? 'text-[8px] leading-tight'
                        : textLength > 110
                        ? 'text-[9.5px] leading-snug'
                        : 'text-[10.5px] leading-snug';

                    return (
                        <div className="border border-black p-2 bg-gray-50 rounded mb-2 space-y-1">
                            <div className="flex justify-between items-center border-b border-gray-300 pb-0.5">
                                <span className="text-[9.5px] font-bold text-gray-800 uppercase">
                                    D. CATATAN & EVALUASI PEMBIMBING HALAQAH:
                                </span>
                                {(totalTeguran > 0 || totalKesalahan > 0) && (
                                    <span className="text-[8.5px] font-semibold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                        Evaluasi Semester: {totalTeguran}x Teguran (Tawaqquf) • {totalKesalahan}x Kesalahan
                                        {totalTajwid > 0 && ` [Tajwid: ${totalTajwid}]`}
                                        {totalMakhraj > 0 && ` [Makhraj: ${totalMakhraj}]`}
                                    </span>
                                )}
                            </div>
                            <p 
                                className={`${dynamicFontClass} italic text-gray-800`}
                                style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    maxHeight: '2.7em'
                                }}
                            >
                                "{cleanCatatan}"
                            </p>
                        </div>
                    );
                })()}
            </div>

            {/* Tanda Tangan 3 Pihak: Space Luas, Sejajar Presisi & Tempat Tanggal Tetap 1 Baris Penuh */}
            <div className="mt-3 pt-3 border-t-2 border-gray-800" style={{ breakInside: 'avoid' }}>
                <div className="grid grid-cols-3 gap-3 text-xs">
                    {/* Kolom 1: Orang Tua / Wali */}
                    <div className="min-h-[135px] flex flex-col justify-between items-center text-center">
                        <div className="h-16 flex flex-col justify-end items-center">
                            <p className="font-bold text-gray-900 leading-snug">{finalOrangTuaLabel}</p>
                        </div>
                        <div className="w-full pt-12">
                            <p className="font-bold underline text-gray-900">{finalOrangTuaName}</p>
                            <p className="text-[9.5px] text-gray-600 mt-0.5">{santri.namaLengkap ? `Wali dari ${santri.namaLengkap}` : 'Orang Tua / Wali'}</p>
                        </div>
                    </div>

                    {/* Kolom 2: Pembimbing / Muhaffizh (Tempat & Tanggal 1 Baris Utuh tanpa Terpotong/Ellipsis dengan Spasi Lebih Lega) */}
                    <div className="min-h-[135px] flex flex-col justify-between items-center text-center">
                        <div className="h-16 flex flex-col justify-start items-center">
                            <p className="text-[10px] text-gray-700 whitespace-nowrap leading-tight mb-1.5 font-medium">
                                {tempatPenetapan}, {tanggalDisplay}
                            </p>
                            <p className="font-semibold text-gray-800 leading-tight mb-1">Mengetahui,</p>
                            <p className="font-bold text-gray-900 leading-tight">Muhaffizh / Pembimbing</p>
                        </div>
                        <div className="w-full pt-12">
                            <p className="font-bold underline text-gray-900">{finalMuhaffizhName}</p>
                            <p className="text-[9.5px] text-gray-600 mt-0.5">{finalMuhaffizhLabel}</p>
                        </div>
                    </div>

                    {/* Kolom 3: Mudir / Pimpinan Pondok Pesantren */}
                    <div className="min-h-[135px] flex flex-col justify-between items-center text-center">
                        <div className="h-16 flex flex-col justify-end items-center">
                            <p className="font-bold text-gray-900 leading-snug">{finalMudirJabatan}</p>
                        </div>
                        <div className="w-full pt-12">
                            <p className="font-bold underline text-gray-900">{finalMudirName}</p>
                            <p className="text-[9.5px] text-gray-600 mt-0.5">{settings.namaPonpes || 'Pimpinan Pondok Pesantren'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <ReportFooter />
        </div>
    );
};

export const TahfizhSemesterRaporTemplate = React.memo(TahfizhSemesterRaporTemplateComponent);
