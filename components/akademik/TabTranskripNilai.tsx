import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { DigitalAsset, PondokSettings, Santri } from '../../types';
import {
    buildCohortTranscriptSummary,
    exportCohortTranscriptToExcel,
    exportStudentTranscriptToExcel,
    StudentTranscriptData,
    TranscriptDocMode,
    TranscriptJenjangScope,
    TranscriptSubjectRow
} from '../../services/raporTranscriptService';
import { PrintHeader } from '../common/PrintHeader';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { RaporSignatureStampMedia } from '../common/RaporSignatureStampMedia';
import {
    DateFormatMode,
    formatDate,
    formatLocalDate,
    formatTanggalDokumen,
    resolveTempatRapor
} from '../../utils/formatters';
import {
    formatTeacherNip,
    ResolvedCellMediaVisual,
    resolveMudirAamInfo,
    resolveMudirMarhalahTeacher,
    resolveWaliKelasTeacher
} from '../../utils/raporPlaceholderResolver';
import {
    findJenjangStempelAsset,
    findPrimaryPonpesStempelSrc,
    findStrictTeacherTtdAsset
} from '../../utils/digitalAssetUtils';
import { printToPdfNative } from '../../utils/pdfGenerator';

export interface TabTranskripNilaiProps {
    initialRombelId?: number;
    initialSantriId?: number;
    onNavigateToInputWali?: (rombelId?: number, santriId?: number) => void;
}

interface TranscriptPrintOptions {
    docMode: TranscriptDocMode;
    groupByRumpun: boolean;
    includeCurriculumTemplate: boolean;
    paperSize: 'A4' | 'F4';
    orientation: 'portrait' | 'landscape';
    showKop: boolean;
    showPhoto: boolean;
    showTahfizh: boolean;
    showDigitalTtd: boolean;
    nomorDokumen: string;
    tempatCetak: string;
    tanggalCetak: string;
    dateFormatMode: DateFormatMode;
    decimalPlaces: 0 | 1 | 2;
}

const TRANSCRIPT_PREF_KEY = 'esantri_transkrip_print_prefs';

const RUMPUN_ORDER: Record<string, number> = {
    Diniyah: 1,
    Tahfizh: 2,
    Bahasa: 3,
    Umum: 4,
    'Muatan Lokal': 5,
    Lainnya: 6
};

const PrintableTranscriptDocument: React.FC<{
    data: StudentTranscriptData;
    settings: PondokSettings;
    digitalAssets: DigitalAsset[];
    options: TranscriptPrintOptions;
    isLastDocument: boolean;
}> = ({ data, settings, digitalAssets, options, isLastDocument }) => {
    const [photoFailed, setPhotoFailed] = useState(false);

    useEffect(() => {
        setPhotoFailed(false);
    }, [data.santri.fotoUrl, data.santri.id]);

    const fmtScore = (val: number | null | undefined): string => {
        if (val === null || val === undefined || !isFinite(val)) return '-';
        return val.toFixed(options.decimalPlaces);
    };

    const rombelObj = settings.rombel.find(r => r.id === data.santri.rombelId);
    const jenjangObj = data.jenjangId
        ? settings.jenjang.find(j => j.id === data.jenjangId)
        : settings.jenjang.find(j => j.id === data.santri.jenjangId);

    const mudirMarhalah = resolveMudirMarhalahTeacher(jenjangObj, settings);
    const mudirAamInfo = resolveMudirAamInfo(settings);
    const waliKelas = resolveWaliKelasTeacher(rombelObj, settings);

    const leftSignatoryTeacher = mudirMarhalah || waliKelas;
    const leftSignatoryTitle = mudirMarhalah
        ? `Mudir Marhalah ${jenjangObj?.nama || ''}`.trim()
        : `Wali Kelas ${rombelObj?.nama || ''}`.trim();
    const leftSignatoryName = leftSignatoryTeacher?.nama || '..................................';
    const leftSignatoryNip = leftSignatoryTeacher ? formatTeacherNip(leftSignatoryTeacher) : '-';

    const rightSignatoryTeacher = mudirAamInfo.teacher;
    const rightSignatoryTitle = 'Pimpinan Pondok / Kepala Madrasah';
    const rightSignatoryName = mudirAamInfo.nama || '..................................';
    const rightSignatoryNip = mudirAamInfo.nip;

    const leftVisual = useMemo<ResolvedCellMediaVisual | null>(() => {
        if (!options.showDigitalTtd || !leftSignatoryTeacher) return null;
        const ttd = findStrictTeacherTtdAsset(digitalAssets, leftSignatoryTeacher);
        const marhalahStamp = mudirMarhalah ? findJenjangStempelAsset(digitalAssets, jenjangObj) : undefined;
        if (!ttd?.base64Image && !marhalahStamp?.base64Image) return null;
        return {
            kind: marhalahStamp?.base64Image ? 'ttd_with_stempel' : 'ttd_only',
            primarySrc: ttd?.base64Image || null,
            stempelOverlaySrc: marhalahStamp?.base64Image || null,
            position: 'left',
            size: 'md',
            showWhenTtdEmpty: false,
            placeholderLabel: leftSignatoryTitle,
            rawTag: '$TTD_MUDIR_MARHALAH'
        };
    }, [options.showDigitalTtd, leftSignatoryTeacher, digitalAssets, mudirMarhalah, jenjangObj, leftSignatoryTitle]);

    const rightVisual = useMemo<ResolvedCellMediaVisual | null>(() => {
        if (!options.showDigitalTtd) return null;
        const ttd = rightSignatoryTeacher ? findStrictTeacherTtdAsset(digitalAssets, rightSignatoryTeacher) : undefined;
        const ponpesStampSrc = findPrimaryPonpesStempelSrc(settings, digitalAssets);
        if (!ttd?.base64Image && !ponpesStampSrc) return null;
        return {
            kind: ponpesStampSrc ? 'ttd_with_stempel' : 'ttd_only',
            primarySrc: ttd?.base64Image || null,
            stempelOverlaySrc: ponpesStampSrc || null,
            position: 'left',
            size: 'md',
            showWhenTtdEmpty: false,
            placeholderLabel: rightSignatoryTitle,
            rawTag: '$TTD_STEMPEL_MUDIR'
        };
    }, [options.showDigitalTtd, rightSignatoryTeacher, settings, digitalAssets, rightSignatoryTitle]);

    const groupedSubjects = useMemo(() => {
        if (!options.groupByRumpun) {
            return [{ rumpun: '', rows: data.subjectRows }];
        }
        const map = new Map<string, TranscriptSubjectRow[]>();
        data.subjectRows.forEach(row => {
            const r = row.rumpun || 'Umum';
            const arr = map.get(r) || [];
            arr.push(row);
            map.set(r, arr);
        });
        return Array.from(map.entries())
            .sort((a, b) => (RUMPUN_ORDER[a[0]] || 99) - (RUMPUN_ORDER[b[0]] || 99) || a[0].localeCompare(b[0]))
            .map(([rumpun, rows]) => ({ rumpun, rows }));
    }, [data.subjectRows, options.groupByRumpun]);

    const docMainTitle =
        options.docMode === 'buku_induk_6'
            ? `LEMBAR BUKU INDUK NILAI HASIL BELAJAR SANTRI${data.jenjangName && data.jenjangName !== '-' ? `\nMARHALAH ${data.jenjangName.toUpperCase()}` : ''}`
            : `TRANSKRIP NILAI AKADEMIK KUMULATIF${data.jenjangName && data.jenjangName !== '-' ? `\nMARHALAH ${data.jenjangName.toUpperCase()}` : ''}`;

    const formattedTitimangsaDate = formatTanggalDokumen(options.tanggalCetak || new Date(), {
        formatMode: options.dateFormatMode,
        hijriAdjustment: settings.hijriAdjustment || 0
    });

    const isCompactCols = data.slots.length >= 6;
    const cellPad = isCompactCols ? 'px-1.5 py-1' : 'px-2 py-1.5';
    const tableFontClass = isCompactCols ? 'text-[9.5px]' : 'text-[10.5px]';

    let runningNumber = 0;

    return (
        <div
            data-print-orientation={options.orientation}
            className={`printable-content-wrapper bg-white text-black font-sans ${
                options.orientation === 'landscape' ? 'print-landscape max-w-[1120px]' : 'print-portrait max-w-[820px]'
            } mx-auto p-6 sm:p-8 border border-slate-200 shadow-xs print:border-none print:shadow-none print:p-0 ${
                !isLastDocument ? 'page-break-after mb-8 print:mb-0' : ''
            }`}
        >
            {/* Header / Kop */}
            {options.showKop ? (
                <PrintHeader settings={settings} title={docMainTitle} compact={isCompactCols} />
            ) : (
                <div className="text-center border-b-2 border-black pb-2.5 mb-3">
                    {docMainTitle.split('\n').map((line, i) => (
                        <div
                            key={i}
                            className={
                                i === 0
                                    ? 'text-base font-black tracking-wide uppercase'
                                    : 'text-xs font-bold uppercase text-slate-900 mt-0.5'
                            }
                        >
                            {line}
                        </div>
                    ))}
                </div>
            )}

            {options.nomorDokumen.trim() && (
                <div className="text-center text-[11px] font-semibold -mt-1.5 mb-3">
                    Nomor: <span className="font-mono">{options.nomorDokumen.trim()}</span>
                </div>
            )}

            {/* Biodata Santri */}
            <div className="flex items-start justify-between gap-4 mb-3 pb-2.5 border-b border-slate-300 text-[11px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 flex-1">
                    <div className="space-y-0.5">
                        <div className="flex">
                            <span className="w-32 text-slate-700 shrink-0">Nama Lengkap</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-bold uppercase">{data.santri.namaLengkap}</span>
                        </div>
                        <div className="flex">
                            <span className="w-32 text-slate-700 shrink-0">NIS / NISN</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-mono tabular-nums">
                                {data.santri.nis || '-'} / {data.santri.nisn || '-'}
                            </span>
                        </div>
                        <div className="flex">
                            <span className="w-32 text-slate-700 shrink-0">Tempat, Tgl Lahir</span>
                            <span className="mr-1.5">:</span>
                            <span>
                                {data.santri.tempatLahir || '-'}, {formatDate(data.santri.tanggalLahir) || '-'}
                            </span>
                        </div>
                        <div className="flex">
                            <span className="w-32 text-slate-700 shrink-0">Nama Orang Tua</span>
                            <span className="mr-1.5">:</span>
                            <span>{data.santri.namaAyah || data.santri.namaWali || data.santri.namaIbu || '-'}</span>
                        </div>
                    </div>

                    <div className="space-y-0.5">
                        <div className="flex">
                            <span className="w-32 text-slate-700 shrink-0">Marhalah / Jenjang</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-semibold">{data.jenjangName}</span>
                        </div>
                        <div className="flex">
                            <span className="w-32 text-slate-700 shrink-0">Kelas / Rombel</span>
                            <span className="mr-1.5">:</span>
                            <span>
                                {data.kelasName} / {data.rombelName}
                            </span>
                        </div>
                        <div className="flex">
                            <span className="w-32 text-slate-700 shrink-0">Tahun Masuk</span>
                            <span className="mr-1.5">:</span>
                            <span className="tabular-nums">
                                {data.santri.tanggalMasuk ? formatDate(data.santri.tanggalMasuk) : '-'}
                            </span>
                        </div>
                        <div className="flex">
                            <span className="w-32 text-slate-700 shrink-0">Status Santri</span>
                            <span className="mr-1.5">:</span>
                            <span className="font-semibold">{data.santri.status || 'Aktif'}</span>
                        </div>
                    </div>
                </div>

                {options.showPhoto && (
                    <div className="shrink-0">
                        {data.santri.fotoUrl && !photoFailed ? (
                            <div className="w-[68px] h-[90px] border border-black p-0.5 bg-white overflow-hidden">
                                <img
                                    src={data.santri.fotoUrl}
                                    alt={`Pasfoto ${data.santri.namaLengkap}`}
                                    referrerPolicy="no-referrer"
                                    onError={() => setPhotoFailed(true)}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-[68px] h-[90px] border border-dashed border-slate-500 flex flex-col items-center justify-center text-[8.5px] text-slate-500 text-center p-1 leading-tight">
                                <span className="font-semibold">PASFOTO</span>
                                <span>3 x 4 cm</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tabel Matriks Nilai Lintas Semester */}
            <table className={`w-full border-collapse border border-black ${tableFontClass} mb-3`}>
                <thead>
                    <tr className="bg-slate-100 text-black">
                        <th rowSpan={2} className={`border border-black ${cellPad} w-7 text-center font-bold`}>
                            No
                        </th>
                        <th rowSpan={2} className={`border border-black ${cellPad} text-left font-bold min-w-[150px]`}>
                            Mata Pelajaran
                        </th>
                        <th rowSpan={2} className={`border border-black ${cellPad} w-10 text-center font-bold`}>
                            KKM
                        </th>
                        {data.slots.length > 0 ? (
                            <th
                                colSpan={data.slots.length}
                                className={`border border-black ${cellPad} text-center font-bold uppercase tracking-wide`}
                            >
                                Capaian Nilai Per Semester
                            </th>
                        ) : (
                            <th className={`border border-black ${cellPad} text-center font-bold`}>Semester</th>
                        )}
                        <th rowSpan={2} className={`border border-black ${cellPad} w-14 text-center font-bold`}>
                            Rerata Mapel
                        </th>
                        <th rowSpan={2} className={`border border-black ${cellPad} w-20 text-center font-bold`}>
                            Predikat
                        </th>
                    </tr>
                    <tr className="bg-slate-50 text-black">
                        {data.slots.length > 0 ? (
                            data.slots.map(slot => (
                                <th
                                    key={slot.slotId}
                                    className={`border border-black px-1 py-1 text-center font-semibold leading-tight min-w-[54px]`}
                                >
                                    <div className="font-bold">{slot.shortLabel}</div>
                                    {!slot.isPlaceholder ? (
                                        <>
                                            <div className="text-[8.5px] font-normal text-slate-700 tabular-nums">
                                                {slot.tahunAjaran} ({slot.semester === 'Ganjil' ? 'Gjl' : 'Gnp'})
                                            </div>
                                            <div className="text-[8px] font-medium text-slate-600">{slot.rombelName}</div>
                                        </>
                                    ) : (
                                        <div className="text-[8px] font-normal text-slate-400 italic">Kosong</div>
                                    )}
                                </th>
                            ))
                        ) : (
                            <th className="border border-black px-2 py-1 text-center text-slate-500 font-normal italic">
                                Belum ada periode
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {data.subjectRows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={5 + Math.max(1, data.slots.length)}
                                className="border border-black p-4 text-center italic text-slate-500"
                            >
                                Belum ada data nilai akademik lintas semester yang tercatat untuk santri ini.
                            </td>
                        </tr>
                    ) : (
                        groupedSubjects.map(group => (
                            <React.Fragment key={group.rumpun || 'all'}>
                                {group.rumpun && (
                                    <tr className="bg-slate-50/90">
                                        <td
                                            colSpan={5 + Math.max(1, data.slots.length)}
                                            className={`border border-black ${cellPad} font-bold uppercase tracking-wide text-[9.5px] text-slate-800`}
                                        >
                                            Kelompok {group.rumpun}
                                        </td>
                                    </tr>
                                )}
                                {group.rows.map(row => {
                                    runningNumber += 1;
                                    return (
                                        <tr key={row.subjectId}>
                                            <td className={`border border-black ${cellPad} text-center tabular-nums`}>
                                                {runningNumber}
                                            </td>
                                            <td className={`border border-black ${cellPad} font-medium`}>
                                                {row.nama}
                                            </td>
                                            <td className={`border border-black ${cellPad} text-center tabular-nums text-slate-700`}>
                                                {row.kkm}
                                            </td>
                                            {data.slots.length > 0 ? (
                                                data.slots.map(slot => {
                                                    const cell = row.scoresBySlot[slot.slotId];
                                                    const num = cell?.numeric ?? null;
                                                    const belowKkm = num !== null && num < row.kkm - 1e-6;
                                                    return (
                                                        <td
                                                            key={slot.slotId}
                                                            className={`border border-black ${cellPad} text-center tabular-nums ${
                                                                belowKkm ? 'font-bold underline decoration-dotted' : ''
                                                            } ${slot.isPlaceholder ? 'text-slate-300' : ''}`}
                                                        >
                                                            {cell
                                                                ? cell.isUntaughtDash
                                                                    ? '-'
                                                                    : num !== null
                                                                    ? num
                                                                    : cell.raw || '-'
                                                                : '-'}
                                                        </td>
                                                    );
                                                })
                                            ) : (
                                                <td className={`border border-black ${cellPad} text-center`}>-</td>
                                            )}
                                            <td className={`border border-black ${cellPad} text-center font-bold tabular-nums`}>
                                                {fmtScore(row.cumulativeAverage)}
                                            </td>
                                            <td className={`border border-black ${cellPad} text-center`}>
                                                {row.cumulativePredikat
                                                    ? `${row.cumulativePredikat.predikat} (${row.cumulativePredikat.predikatHuruf})`
                                                    : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    )}

                    {/* Baris Ringkasan Bawah Tabel */}
                    {data.subjectRows.length > 0 && (
                        <>
                            <tr className="bg-slate-50 font-semibold">
                                <td colSpan={3} className={`border border-black ${cellPad} text-right`}>
                                    Jumlah Nilai Semester
                                </td>
                                {data.slots.length > 0 ? (
                                    data.slots.map(slot => {
                                        const sum = data.semesterSummaries[slot.slotId];
                                        return (
                                            <td
                                                key={slot.slotId}
                                                className={`border border-black ${cellPad} text-center tabular-nums`}
                                            >
                                                {sum && sum.numericCount > 0 ? fmtScore(sum.totalNilai) : '-'}
                                            </td>
                                        );
                                    })
                                ) : (
                                    <td className={`border border-black ${cellPad} text-center`}>-</td>
                                )}
                                <td className={`border border-black ${cellPad} text-center font-bold tabular-nums`}>
                                    {data.overallNumericSubjectCount > 0 ? fmtScore(data.totalAccumulatedScore) : '-'}
                                </td>
                                <td className={`border border-black ${cellPad} text-center`}>-</td>
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <td colSpan={3} className={`border border-black ${cellPad} text-right uppercase`}>
                                    Rata-Rata Semester / IPK Kumulatif
                                </td>
                                {data.slots.length > 0 ? (
                                    data.slots.map(slot => {
                                        const sum = data.semesterSummaries[slot.slotId];
                                        return (
                                            <td
                                                key={slot.slotId}
                                                className={`border border-black ${cellPad} text-center tabular-nums`}
                                            >
                                                {sum && sum.rataRata !== null ? fmtScore(sum.rataRata) : '-'}
                                            </td>
                                        );
                                    })
                                ) : (
                                    <td className={`border border-black ${cellPad} text-center`}>-</td>
                                )}
                                <td className={`border border-black ${cellPad} text-center font-black tabular-nums`}>
                                    {fmtScore(data.cumulativeAverage)}
                                </td>
                                <td className={`border border-black ${cellPad} text-center font-bold`}>
                                    {data.cumulativePredikat
                                        ? `${data.cumulativePredikat.predikat} (${data.cumulativePredikat.predikatHuruf})`
                                        : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={3} className={`border border-black ${cellPad} text-right font-medium`}>
                                    Ketidakhadiran (S / I / A)
                                </td>
                                {data.slots.length > 0 ? (
                                    data.slots.map(slot => {
                                        const sum = data.semesterSummaries[slot.slotId];
                                        return (
                                            <td
                                                key={slot.slotId}
                                                className={`border border-black ${cellPad} text-center text-[9px] tabular-nums`}
                                            >
                                                {sum && sum.record ? `${sum.sakit}/${sum.izin}/${sum.alpha}` : '-'}
                                            </td>
                                        );
                                    })
                                ) : (
                                    <td className={`border border-black ${cellPad} text-center`}>-</td>
                                )}
                                <td
                                    colSpan={2}
                                    className={`border border-black ${cellPad} text-center text-[9.5px] font-semibold tabular-nums`}
                                >
                                    Total S:{data.totalSakit} · I:{data.totalIzin} · A:{data.totalAlpha}
                                </td>
                            </tr>
                        </>
                    )}
                </tbody>
            </table>

            {/* Ringkasan Kumulatif & Tahfizh */}
            <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-[10px]"
                style={{ breakInside: 'avoid' }}
            >
                <div className="border border-black p-2.5">
                    <div className="font-bold uppercase tracking-wide border-b border-slate-300 pb-1 mb-1.5">
                        Ringkasan Indeks Prestasi Kumulatif
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex justify-between">
                            <span className="text-slate-700">Jumlah Semester Tercatat</span>
                            <span className="font-bold tabular-nums">{data.recordedSemesterCount} Semester</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-700">Indeks Rata-Rata Kumulatif</span>
                            <span className="font-bold tabular-nums">
                                {fmtScore(data.cumulativeAverage)}{' '}
                                {data.cumulativePredikat ? `(${data.cumulativePredikat.predikat})` : ''}
                            </span>
                        </div>
                        {data.latestKeputusan && (
                            <div className="flex justify-between">
                                <span className="text-slate-700">Keterangan Akademik Terakhir</span>
                                <span className="font-semibold">{data.latestKeputusan}</span>
                            </div>
                        )}
                    </div>
                </div>

                {options.showTahfizh && (
                    <div className="border border-black p-2.5">
                        <div className="font-bold uppercase tracking-wide border-b border-slate-300 pb-1 mb-1.5">
                            Rekam Capaian Tahfizhul Qur&apos;an
                        </div>
                        {data.tahfizhSummary ? (
                            <div className="space-y-0.5">
                                <div className="flex justify-between">
                                    <span className="text-slate-700">Posisi Setoran Terakhir</span>
                                    <span className="font-bold">
                                        {data.tahfizhSummary.latestJuz ? `Juz ${data.tahfizhSummary.latestJuz}` : ''}
                                        {data.tahfizhSummary.latestSurah ? `, QS. ${data.tahfizhSummary.latestSurah}` : ''}
                                        {data.tahfizhSummary.latestAyat ? `:${data.tahfizhSummary.latestAyat}` : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-700">Predikat Kelancaran</span>
                                    <span className="font-semibold">{data.tahfizhSummary.latestPredikat || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-700">Cakupan Juz Tercatat</span>
                                    <span className="font-semibold tabular-nums">
                                        {data.tahfizhSummary.distinctJuzCount > 0
                                            ? `${data.tahfizhSummary.distinctJuzCount} Juz (${data.tahfizhSummary.totalRecords} setoran)`
                                            : 'Tercatat di Rapor'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 italic py-1">
                                Data setoran mutaba&apos;ah tahfizh belum tercatat pada periode ini.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Blok Tanda Tangan Pengesahan */}
            <div className="grid grid-cols-2 gap-8 mt-5 text-[10.5px]" style={{ breakInside: 'avoid' }}>
                <div className="text-center">
                    <p className="text-slate-700">Mengetahui,</p>
                    <p className="font-bold">{leftSignatoryTitle}</p>
                    <div className="h-16 flex items-center justify-center my-0.5">
                        {leftVisual && <RaporSignatureStampMedia visual={leftVisual} mode="print" />}
                    </div>
                    <p className="font-bold underline">{leftSignatoryName}</p>
                    {leftSignatoryNip && leftSignatoryNip !== '-' && (
                        <p className="text-[9.5px] text-slate-700 font-mono tabular-nums">NIP/NIY: {leftSignatoryNip}</p>
                    )}
                </div>

                <div className="text-center">
                    <p className="text-slate-700">
                        {options.tempatCetak || resolveTempatRapor(settings, 'Pesantren')}, {formattedTitimangsaDate}
                    </p>
                    <p className="font-bold">{rightSignatoryTitle}</p>
                    <div className="h-16 flex items-center justify-center my-0.5">
                        {rightVisual && <RaporSignatureStampMedia visual={rightVisual} mode="print" />}
                    </div>
                    <p className="font-bold underline">{rightSignatoryName}</p>
                    {rightSignatoryNip && rightSignatoryNip !== '-' && (
                        <p className="text-[9.5px] text-slate-700 font-mono tabular-nums">NIP/NIY: {rightSignatoryNip}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export const TabTranskripNilai: React.FC<TabTranskripNilaiProps> = ({
    initialRombelId,
    initialSantriId,
    onNavigateToInputWali
}) => {
    const { settings, currentUser, showToast, showConfirmation } = useAppContext();
    const { santriList } = useSantriContext();

    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const assignedRombels = useMemo(() => {
        if (!isWaliKelas) return [];
        return settings.rombel.filter(
            r => r.waliKelasUserId === currentUser?.id || r.waliKelasId === currentUser?.id
        );
    }, [isWaliKelas, currentUser, settings.rombel]);
    const assignedRombel = assignedRombels[0] || null;

    // Filters
    const [selectedJenjangId, setSelectedJenjangId] = useState<string>('');
    const [selectedKelasId, setSelectedKelasId] = useState<string>('');
    const [selectedRombelId, setSelectedRombelId] = useState<string>(
        initialRombelId
            ? String(initialRombelId)
            : assignedRombel
            ? String(assignedRombel.id)
            : settings.rombel[0]
            ? String(settings.rombel[0].id)
            : ''
    );
    const [santriStatusFilter, setSantriStatusFilter] = useState<'Aktif' | 'Lulus' | 'Keluar/Pindah' | 'all'>('Aktif');
    const [jenjangScope, setJenjangScope] = useState<TranscriptJenjangScope>('active_jenjang');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortBy, setSortBy] = useState<'rank' | 'name' | 'nis'>('rank');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    // Print & View Preferences
    const [printPrefs, setPrintPrefs] = useState<TranscriptPrintOptions>(() => {
        const defaultTempat = resolveTempatRapor(settings, 'Pesantren');
        const defaultTgl = settings.tanggalRaporDefault || formatLocalDate(new Date());
        const defaultFmt: DateFormatMode = settings.formatTanggalRaporDefault || 'masehi';
        const fallback: TranscriptPrintOptions = {
            docMode: 'transkrip',
            groupByRumpun: false,
            includeCurriculumTemplate: false,
            paperSize: 'A4',
            orientation: 'portrait',
            showKop: true,
            showPhoto: true,
            showTahfizh: true,
            showDigitalTtd: true,
            nomorDokumen: '',
            tempatCetak: defaultTempat,
            tanggalCetak: defaultTgl,
            dateFormatMode: defaultFmt,
            decimalPlaces: 2
        };
        try {
            const raw = localStorage.getItem(TRANSCRIPT_PREF_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    ...fallback,
                    ...parsed,
                    tempatCetak: parsed.tempatCetak || defaultTempat,
                    tanggalCetak: parsed.tanggalCetak || defaultTgl
                };
            }
        } catch {}
        return fallback;
    });

    useEffect(() => {
        try {
            localStorage.setItem(TRANSCRIPT_PREF_KEY, JSON.stringify(printPrefs));
        } catch {}
    }, [printPrefs]);

    const updatePref = <K extends keyof TranscriptPrintOptions>(key: K, value: TranscriptPrintOptions[K]) => {
        setPrintPrefs(prev => ({ ...prev, [key]: value }));
    };

    // Sync initial rombel/santri context
    useEffect(() => {
        if (initialRombelId) {
            setSelectedRombelId(String(initialRombelId));
        }
    }, [initialRombelId]);

    useEffect(() => {
        if (selectedRombelId) {
            const r = settings.rombel.find(item => item.id === parseInt(selectedRombelId, 10));
            if (r) {
                setSelectedKelasId(String(r.kelasId));
                const k = settings.kelas.find(item => item.id === r.kelasId);
                if (k) {
                    setSelectedJenjangId(String(k.jenjangId));
                }
            }
        }
    }, [selectedRombelId, settings.rombel, settings.kelas]);

    // Scoped dropdown lists
    const availableJenjangList = useMemo(() => {
        if (!isWaliKelas) return settings.jenjang;
        const allowedKelasIds = new Set(assignedRombels.map(r => r.kelasId));
        const allowedJenjangIds = new Set(
            settings.kelas.filter(k => allowedKelasIds.has(k.id)).map(k => k.jenjangId)
        );
        return settings.jenjang.filter(j => allowedJenjangIds.has(j.id));
    }, [isWaliKelas, assignedRombels, settings.kelas, settings.jenjang]);

    const filteredKelasList = useMemo(() => {
        let list = settings.kelas;
        if (isWaliKelas) {
            const allowedKelasIds = new Set(assignedRombels.map(r => r.kelasId));
            list = list.filter(k => allowedKelasIds.has(k.id));
        }
        if (selectedJenjangId) {
            list = list.filter(k => k.jenjangId === parseInt(selectedJenjangId, 10));
        }
        return list;
    }, [settings.kelas, selectedJenjangId, isWaliKelas, assignedRombels]);

    const filteredRombelList = useMemo(() => {
        let list = isWaliKelas ? assignedRombels : settings.rombel;
        if (selectedKelasId) {
            list = list.filter(r => r.kelasId === parseInt(selectedKelasId, 10));
        } else if (selectedJenjangId) {
            const allowedKelas = new Set(filteredKelasList.map(k => k.id));
            list = list.filter(r => allowedKelas.has(r.kelasId));
        }
        return list;
    }, [settings.rombel, selectedKelasId, selectedJenjangId, filteredKelasList, isWaliKelas, assignedRombels]);

    // Cohort Santri Pool
    const cohortSantriPool = useMemo(() => {
        const allowedRombelIds = isWaliKelas
            ? new Set(assignedRombels.map(r => r.id))
            : null;

        return santriList
            .filter(s => {
                if (s.deleted) return false;
                if (allowedRombelIds && !allowedRombelIds.has(s.rombelId)) return false;

                if (santriStatusFilter !== 'all' && s.status !== santriStatusFilter) {
                    return false;
                }

                if (selectedRombelId) {
                    return s.rombelId === parseInt(selectedRombelId, 10);
                }
                if (selectedKelasId) {
                    return s.kelasId === parseInt(selectedKelasId, 10);
                }
                if (selectedJenjangId) {
                    return s.jenjangId === parseInt(selectedJenjangId, 10);
                }
                return true;
            })
            .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [
        santriList,
        isWaliKelas,
        assignedRombels,
        santriStatusFilter,
        selectedRombelId,
        selectedKelasId,
        selectedJenjangId
    ]);

    const cohortStudentIds = useMemo(() => cohortSantriPool.map(s => s.id), [cohortSantriPool]);

    // Live query all historical raporRecords + tahfizhRecords + digitalAssets for this cohort
    const liveBundle = useLiveQuery(
        async () => {
            if (cohortStudentIds.length === 0) {
                const assets = await db.digitalAssets.toArray();
                return { raporRecords: [], tahfizhRecords: [], digitalAssets: assets };
            }
            const [raporRecords, tahfizhRecords, digitalAssets] = await Promise.all([
                db.raporRecords.where('santriId').anyOf(cohortStudentIds).toArray(),
                db.tahfizh.where('santriId').anyOf(cohortStudentIds).toArray(),
                db.digitalAssets.toArray()
            ]);
            return { raporRecords, tahfizhRecords, digitalAssets };
        },
        [cohortStudentIds.join(',')]
    );

    const isLoading = liveBundle === undefined;
    const allRaporRecords = liveBundle?.raporRecords || [];
    const allTahfizhRecords = liveBundle?.tahfizhRecords || [];
    const digitalAssets = liveBundle?.digitalAssets || [];

    const targetJenjangNumeric = selectedJenjangId ? parseInt(selectedJenjangId, 10) : undefined;

    const cohortSummary = useMemo(() => {
        return buildCohortTranscriptSummary({
            santriList: cohortSantriPool,
            allRaporRecords,
            settings,
            tahfizhRecords: allTahfizhRecords,
            docMode: printPrefs.docMode,
            jenjangScope,
            targetJenjangId: jenjangScope === 'active_jenjang' ? targetJenjangNumeric : undefined,
            includeMasterCurriculumSubjects:
                printPrefs.includeCurriculumTemplate || printPrefs.docMode === 'buku_induk_6'
        });
    }, [
        cohortSantriPool,
        allRaporRecords,
        settings,
        allTahfizhRecords,
        printPrefs.docMode,
        printPrefs.includeCurriculumTemplate,
        jenjangScope,
        targetJenjangNumeric
    ]);

    // Filtered & Sorted rows for UI table
    const displayedStudents = useMemo(() => {
        let list = [...cohortSummary.students];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                item =>
                    item.santri.namaLengkap.toLowerCase().includes(q) ||
                    (item.santri.nis || '').toLowerCase().includes(q) ||
                    (item.santri.nisn || '').toLowerCase().includes(q)
            );
        }

        if (sortBy === 'rank') {
            list.sort((a, b) => {
                if (a.cohortRank === 0 && b.cohortRank === 0) {
                    return a.santri.namaLengkap.localeCompare(b.santri.namaLengkap);
                }
                if (a.cohortRank === 0) return 1;
                if (b.cohortRank === 0) return -1;
                return a.cohortRank - b.cohortRank;
            });
        } else if (sortBy === 'name') {
            list.sort((a, b) => a.santri.namaLengkap.localeCompare(b.santri.namaLengkap));
        } else if (sortBy === 'nis') {
            list.sort((a, b) => (a.santri.nis || '').localeCompare(b.santri.nis || ''));
        }

        return list;
    }, [cohortSummary.students, searchQuery, sortBy]);

    // Selection state for batch printing
    const [selectedSantriIds, setSelectedSantriIds] = useState<Set<number>>(new Set());
    const [activeModalSantriId, setActiveModalSantriId] = useState<number | null>(initialSantriId || null);
    const [isBatchPrintOpen, setIsBatchPrintOpen] = useState<boolean>(false);
    const [isExportingCohort, setIsExportingCohort] = useState<boolean>(false);
    const [isExportingSingle, setIsExportingSingle] = useState<boolean>(false);

    useEffect(() => {
        if (initialSantriId) {
            setActiveModalSantriId(initialSantriId);
        }
    }, [initialSantriId]);

    // Keep selection valid when cohort changes
    useEffect(() => {
        const validSet = new Set(cohortSummary.students.map(s => s.santri.id));
        setSelectedSantriIds(prev => {
            const next = new Set<number>();
            prev.forEach(id => {
                if (validSet.has(id)) next.add(id);
            });
            return next;
        });
    }, [cohortSummary.students]);

    const activeStudentTranscript = useMemo(() => {
        if (!activeModalSantriId) return null;
        return cohortSummary.students.find(s => s.santri.id === activeModalSantriId) || null;
    }, [activeModalSantriId, cohortSummary.students]);

    const activeStudentIndex = useMemo(() => {
        if (!activeModalSantriId) return -1;
        return displayedStudents.findIndex(s => s.santri.id === activeModalSantriId);
    }, [activeModalSantriId, displayedStudents]);

    const cohortTitleLabel = useMemo(() => {
        if (selectedRombelId) {
            const r = settings.rombel.find(x => x.id === parseInt(selectedRombelId, 10));
            return r ? `Rombel ${r.nama}` : 'Rombel';
        }
        if (selectedKelasId) {
            const k = settings.kelas.find(x => x.id === parseInt(selectedKelasId, 10));
            return k ? `Kelas ${k.nama}` : 'Kelas';
        }
        if (selectedJenjangId) {
            const j = settings.jenjang.find(x => x.id === parseInt(selectedJenjangId, 10));
            return j ? `Marhalah ${j.nama}` : 'Marhalah';
        }
        return 'Seluruh Santri';
    }, [selectedRombelId, selectedKelasId, selectedJenjangId, settings.rombel, settings.kelas, settings.jenjang]);

    const toggleSelectStudent = (id: number) => {
        setSelectedSantriIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleSelectAllDisplayed = () => {
        const allSelected =
            displayedStudents.length > 0 && displayedStudents.every(s => selectedSantriIds.has(s.santri.id));
        setSelectedSantriIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                displayedStudents.forEach(s => next.delete(s.santri.id));
            } else {
                displayedStudents.forEach(s => next.add(s.santri.id));
            }
            return next;
        });
    };

    const handleSelectScoredOnly = () => {
        const next = new Set<number>();
        displayedStudents.forEach(s => {
            if (s.recordedSemesterCount > 0) next.add(s.santri.id);
        });
        setSelectedSantriIds(next);
        showToast(`${next.size} santri yang memiliki riwayat nilai dipilih.`, 'info');
    };

    const handleExportCohortExcel = async () => {
        if (displayedStudents.length === 0) return;
        setIsExportingCohort(true);
        try {
            const fileName = await exportCohortTranscriptToExcel({
                students: displayedStudents,
                unionPeriods: cohortSummary.unionPeriods,
                cohortTitle: cohortTitleLabel,
                settings,
                decimalPlaces: printPrefs.decimalPlaces
            });
            showToast(`Rekap kumulatif diekspor: ${fileName}`, 'success');
        } catch (err) {
            console.error(err);
            showToast('Gagal mengekspor rekap transkrip ke Excel.', 'error');
        } finally {
            setIsExportingCohort(false);
        }
    };

    const handleExportSingleExcel = async (target: StudentTranscriptData) => {
        setIsExportingSingle(true);
        try {
            const fileName = await exportStudentTranscriptToExcel({
                data: target,
                settings,
                docMode: printPrefs.docMode,
                decimalPlaces: printPrefs.decimalPlaces,
                nomorDokumen: printPrefs.nomorDokumen
            });
            showToast(`Transkrip santri diekspor: ${fileName}`, 'success');
        } catch (err) {
            console.error(err);
            showToast('Gagal mengekspor transkrip santri.', 'error');
        } finally {
            setIsExportingSingle(false);
        }
    };

    const handlePrintSingle = (target: StudentTranscriptData) => {
        const cleanName = (target.santri.namaLengkap || 'Santri').replace(/[^a-zA-Z0-9]/g, '_');
        const prefix = printPrefs.docMode === 'buku_induk_6' ? 'Buku_Induk_Nilai' : 'Transkrip_Nilai';
        printToPdfNative('single-transcript-print-area', `${prefix}_${cleanName}`, {
            paperSize: printPrefs.paperSize,
            orientation: printPrefs.orientation,
            margin: { top: 1, right: 1, bottom: 1, left: 1 }
        });
    };

    const selectedBatchStudents = useMemo(
        () => displayedStudents.filter(s => selectedSantriIds.has(s.santri.id)),
        [displayedStudents, selectedSantriIds]
    );

    const handleRequestBatchPrint = () => {
        const targets = selectedBatchStudents.length > 0 ? selectedBatchStudents : displayedStudents;
        if (targets.length === 0) {
            showToast('Tidak ada santri untuk dicetak.', 'error');
            return;
        }

        const emptyTargets = targets.filter(t => t.recordedSemesterCount === 0);
        const warnings: string[] = [];
        if (emptyTargets.length > 0 && printPrefs.docMode === 'transkrip') {
            warnings.push(
                `${emptyTargets.length} santri belum memiliki riwayat nilai rapor sama sekali.`
            );
        }
        if (targets.length > 35) {
            warnings.push(
                `Anda memilih ${targets.length} santri sekaligus. Untuk performa peramban terbaik saat menyimpan PDF, disarankan mencetak per rombel (maksimal 30–35 santri per sesi).`
            );
        }

        if (warnings.length > 0) {
            showConfirmation(
                'Konfirmasi Cetak Masal Transkrip',
                `${warnings.join(' ')} Tetap lanjutkan membuka pratinjau cetak masal (${targets.length} dokumen)?`,
                () => {
                    if (selectedBatchStudents.length === 0) {
                        setSelectedSantriIds(new Set(targets.map(t => t.santri.id)));
                    }
                    setIsBatchPrintOpen(true);
                },
                { confirmColor: 'amber', confirmText: 'Lanjutkan Pratinjau' }
            );
            return;
        }

        if (selectedBatchStudents.length === 0) {
            setSelectedSantriIds(new Set(targets.map(t => t.santri.id)));
        }
        setIsBatchPrintOpen(true);
    };

    const handleTriggerBatchPrint = () => {
        const cleanCohort = cohortTitleLabel.replace(/[^a-zA-Z0-9]/g, '_');
        const prefix = printPrefs.docMode === 'buku_induk_6' ? 'Buku_Induk_Masal' : 'Transkrip_Masal';
        printToPdfNative('batch-transcript-print-area', `${prefix}_${cleanCohort}`, {
            paperSize: printPrefs.paperSize,
            orientation: printPrefs.orientation,
            margin: { top: 1, right: 1, bottom: 1, left: 1 }
        });
    };

    const fmtAvg = (val: number | null) =>
        val !== null ? val.toFixed(printPrefs.decimalPlaces) : '-';

    return (
        <div className="space-y-5">
            {/* Panel Filter Kohort & Mode Dokumen */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
                {/* Mobile Filter Trigger */}
                <div className="md:hidden">
                    <button
                        type="button"
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-semibold text-sm whitespace-nowrap"
                    >
                        <i className="bi bi-sliders"></i>
                        <span>Filter Kohort &amp; Status ({cohortTitleLabel})</span>
                    </button>
                </div>

                {/* Desktop Filter Row */}
                <div className="hidden md:grid md:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Marhalah / Jenjang</label>
                        <select
                            value={selectedJenjangId}
                            onChange={e => {
                                setSelectedJenjangId(e.target.value);
                                setSelectedKelasId('');
                                setSelectedRombelId('');
                            }}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        >
                            {!isWaliKelas && <option value="">Semua Jenjang</option>}
                            {availableJenjangList.map(j => (
                                <option key={j.id} value={j.id}>
                                    {j.nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Tingkat Kelas</label>
                        <select
                            value={selectedKelasId}
                            onChange={e => {
                                setSelectedKelasId(e.target.value);
                                setSelectedRombelId('');
                            }}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        >
                            {!isWaliKelas && <option value="">Semua Kelas</option>}
                            {filteredKelasList.map(k => (
                                <option key={k.id} value={k.id}>
                                    {k.nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Rombongan Belajar</label>
                        <select
                            value={selectedRombelId}
                            onChange={e => setSelectedRombelId(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        >
                            {!isWaliKelas && <option value="">Semua Rombel (Angkatan)</option>}
                            {filteredRombelList.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Status Santri</label>
                        <select
                            value={santriStatusFilter}
                            onChange={e => setSantriStatusFilter(e.target.value as any)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        >
                            <option value="Aktif">Santri Aktif</option>
                            <option value="Lulus">Lulus / Alumni</option>
                            <option value="Keluar/Pindah">Mutasi / Pindah</option>
                            <option value="all">Semua Status</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Cakupan Riwayat Nilai</label>
                        <select
                            value={jenjangScope}
                            onChange={e => setJenjangScope(e.target.value as TranscriptJenjangScope)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        >
                            <option value="active_jenjang">Khusus Jenjang Saat Ini</option>
                            <option value="all">Gabung Lintas Semua Jenjang</option>
                        </select>
                    </div>
                </div>

                {/* Toolbar Pencarian, Mode Dokumen, dan Ekspor */}
                <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Segmented Mode Dokumen */}
                        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                            <button
                                type="button"
                                onClick={() => updatePref('docMode', 'transkrip')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                                    printPrefs.docMode === 'transkrip'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Transkrip Kumulatif
                            </button>
                            <button
                                type="button"
                                onClick={() => updatePref('docMode', 'buku_induk_6')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                                    printPrefs.docMode === 'buku_induk_6'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Buku Induk (6 Semester)
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari nama, NIS, NISN..."
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                            />
                        </div>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
                            aria-label="Urutan daftar santri"
                        >
                            <option value="rank">Urut: Peringkat IPK</option>
                            <option value="name">Urut: Nama A–Z</option>
                            <option value="nis">Urut: NIS</option>
                        </select>

                        {/* Decimal precision */}
                        <select
                            value={printPrefs.decimalPlaces}
                            onChange={e => updatePref('decimalPlaces', Number(e.target.value) as 0 | 1 | 2)}
                            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
                            aria-label="Presisi desimal"
                        >
                            <option value={2}>2 Desimal</option>
                            <option value={1}>1 Desimal</option>
                            <option value={0}>Bulat (0 Desimal)</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportCohortExcel}
                            disabled={isExportingCohort || displayedStudents.length === 0}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                            <i className="bi bi-file-earmark-excel text-emerald-600"></i>
                            <span>{isExportingCohort ? 'Mengekspor...' : 'Ekspor Rekap (.xlsx)'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleRequestBatchPrint}
                            disabled={displayedStudents.length === 0}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                            <i className="bi bi-printer-fill"></i>
                            <span>
                                {selectedSantriIds.size > 0
                                    ? `Cetak Terpilih (${selectedSantriIds.size})`
                                    : printPrefs.docMode === 'buku_induk_6'
                                    ? 'Cetak Buku Induk Kohort'
                                    : 'Cetak Transkrip Kohort'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Ringkasan Statistik Kumulatif Kohort */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-medium text-slate-500">Santri Memiliki Riwayat</div>
                    <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                        <span className="text-2xl font-bold text-slate-900">{cohortSummary.scoredStudentCount}</span>
                        <span className="text-xs text-slate-500">dari {cohortSummary.students.length} santri</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-medium text-slate-500">Rerata Kumulatif Kohort</div>
                    <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                        <span className="text-2xl font-bold text-slate-900">
                            {cohortSummary.scoredStudentCount > 0
                                ? cohortSummary.cohortAverage.toFixed(printPrefs.decimalPlaces)
                                : '-'}
                        </span>
                        <span className="text-xs text-slate-500">skala 0–100</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-medium text-slate-500">Rentang Semester Terdata</div>
                    <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                        <span className="text-2xl font-bold text-slate-900">{cohortSummary.maxSemestersRecorded}</span>
                        <span className="text-xs text-slate-500">semester maksimal</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-medium text-slate-500">Tren Prestasi Meningkat</div>
                    <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                        <span className="text-2xl font-bold text-emerald-700">{cohortSummary.upwardTrendCount}</span>
                        <span className="text-xs text-slate-500">santri naik antar-semester</span>
                    </div>
                </div>
            </div>

            {/* Tabel Utama Rekap Kumulatif Lintas Semester */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{cohortTitleLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{displayedStudents.length} santri ditampilkan</span>
                        {selectedSantriIds.size > 0 && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-teal-700 tabular-nums">
                                    {selectedSantriIds.size} dipilih
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <button
                            type="button"
                            onClick={handleSelectScoredOnly}
                            className="font-semibold text-teal-700 hover:text-teal-800 hover:underline whitespace-nowrap"
                        >
                            Pilih yang Ada Nilai
                        </button>
                        {selectedSantriIds.size > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedSantriIds(new Set())}
                                className="font-medium text-slate-500 hover:text-slate-800 hover:underline whitespace-nowrap"
                            >
                                Reset Pilihan
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 space-y-3">
                        {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : displayedStudents.length === 0 ? (
                    <div className="p-10 text-center space-y-3">
                        <div className="text-sm font-semibold text-slate-800">
                            Tidak ada data santri yang cocok dengan filter saat ini
                        </div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Ubah filter Marhalah, Rombel, atau Status Santri (misalnya pilih &quot;Lulus / Alumni&quot; untuk mencetak transkrip santri yang telah tamat).
                        </p>
                    </div>
                ) : cohortSummary.scoredStudentCount === 0 && printPrefs.docMode === 'transkrip' ? (
                    <div className="p-10 text-center space-y-3">
                        <div className="text-sm font-semibold text-slate-800">
                            Belum ada riwayat nilai rapor yang tersimpan untuk kohort ini
                        </div>
                        <p className="text-xs text-slate-500 max-w-lg mx-auto">
                            Transkrip kumulatif mengagregasi nilai lintas semester secara otomatis begitu nilai rapor pada minimal satu semester telah diinput. Anda juga dapat beralih ke mode <strong>Buku Induk (6 Semester)</strong> untuk mencetak blangko buku induk kosong.
                        </p>
                        {onNavigateToInputWali && (
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onNavigateToInputWali(
                                            selectedRombelId ? parseInt(selectedRombelId, 10) : undefined
                                        )
                                    }
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
                                >
                                    Buka Input Nilai Rapor
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                    <th className="py-2.5 px-3 w-9 text-center">
                                        <input
                                            type="checkbox"
                                            checked={
                                                displayedStudents.length > 0 &&
                                                displayedStudents.every(s => selectedSantriIds.has(s.santri.id))
                                            }
                                            onChange={handleToggleSelectAllDisplayed}
                                            aria-label="Pilih semua santri"
                                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                    </th>
                                    <th className="py-2.5 px-2.5 w-12 text-center">Rank</th>
                                    <th className="py-2.5 px-3 min-w-[200px]">Nama Santri &amp; Identitas</th>
                                    <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Jml Sem</th>
                                    {cohortSummary.unionPeriods.map((p, idx) => (
                                        <th
                                            key={p.slotId}
                                            className="py-2.5 px-2.5 text-right whitespace-nowrap"
                                            title={`${p.tahunAjaran} Semester ${p.semester}`}
                                        >
                                            <div>Sem { idx + 1 }</div>
                                            <div className="text-[10px] font-normal text-slate-400 tabular-nums">
                                                {p.tahunAjaran} {p.semester === 'Ganjil' ? 'Gjl' : 'Gnp'}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Rerata Kumulatif</th>
                                    <th className="py-2.5 px-3 text-left whitespace-nowrap">Predikat</th>
                                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Tren</th>
                                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap" title="Akumulasi Sakit / Izin / Alpha">
                                        S / I / A
                                    </th>
                                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayedStudents.map(row => {
                                    const isChecked = selectedSantriIds.has(row.santri.id);
                                    return (
                                        <tr
                                            key={row.santri.id}
                                            className={`hover:bg-slate-50/80 transition-colors ${
                                                isChecked ? 'bg-teal-50/30' : ''
                                            }`}
                                        >
                                            <td className="py-2.5 px-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleSelectStudent(row.santri.id)}
                                                    aria-label={`Pilih ${row.santri.namaLengkap}`}
                                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                />
                                            </td>
                                            <td className="py-2.5 px-2.5 text-center font-mono font-semibold text-slate-700 tabular-nums">
                                                {row.cohortRank > 0 ? `#${row.cohortRank}` : '-'}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="font-semibold text-slate-900">
                                                    {row.santri.namaLengkap}
                                                </div>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 tabular-nums">
                                                    <span>NIS {row.santri.nis || '-'}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span>{row.rombelName}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span>{row.santri.status || 'Aktif'}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-2.5 text-center font-medium text-slate-700 tabular-nums whitespace-nowrap">
                                                {row.recordedSemesterCount} sem
                                            </td>
                                            {cohortSummary.unionPeriods.map(p => {
                                                const semSum = row.semesterSummaries[p.slotId];
                                                return (
                                                    <td
                                                        key={p.slotId}
                                                        className="py-2.5 px-2.5 text-right font-mono text-slate-700 tabular-nums"
                                                    >
                                                        {semSum && semSum.rataRata !== null
                                                            ? fmtAvg(semSum.rataRata)
                                                            : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                                {fmtAvg(row.cumulativeAverage)}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                                                {row.cumulativePredikat
                                                    ? `${row.cumulativePredikat.predikat} (${row.cumulativePredikat.predikatHuruf})`
                                                    : '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                                                {row.trendDirection === 'up' && row.trendDelta !== null && (
                                                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                                                        <i className="bi bi-arrow-up-right"></i>
                                                        <span>+{row.trendDelta.toFixed(1)}</span>
                                                    </span>
                                                )}
                                                {row.trendDirection === 'down' && row.trendDelta !== null && (
                                                    <span className="text-rose-700 font-semibold inline-flex items-center gap-1">
                                                        <i className="bi bi-arrow-down-right"></i>
                                                        <span>{row.trendDelta.toFixed(1)}</span>
                                                    </span>
                                                )}
                                                {row.trendDirection === 'stable' && (
                                                    <span className="text-slate-600 font-medium">Stabil</span>
                                                )}
                                                {(row.trendDirection === 'single' || row.trendDirection === 'none') && (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-2.5 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                                                {row.totalSakit}/{row.totalIzin}/{row.totalAlpha}
                                            </td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveModalSantriId(row.santri.id)}
                                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:text-teal-700 text-slate-700 font-semibold transition-colors whitespace-nowrap"
                                                >
                                                    Buka Transkrip
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Detail & Cetak Individual Transkrip / Buku Induk */}
            {activeStudentTranscript && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col border border-slate-200 shadow-xl overflow-hidden">
                        {/* Top Modal Bar */}
                        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                            <div className="flex items-center gap-2 min-w-0">
                                <button
                                    type="button"
                                    disabled={activeStudentIndex <= 0}
                                    onClick={() => {
                                        if (activeStudentIndex > 0) {
                                            setActiveModalSantriId(
                                                displayedStudents[activeStudentIndex - 1].santri.id
                                            );
                                        }
                                    }}
                                    title="Santri sebelumnya"
                                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 shrink-0"
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                <button
                                    type="button"
                                    disabled={
                                        activeStudentIndex < 0 ||
                                        activeStudentIndex >= displayedStudents.length - 1
                                    }
                                    onClick={() => {
                                        if (
                                            activeStudentIndex >= 0 &&
                                            activeStudentIndex < displayedStudents.length - 1
                                        ) {
                                            setActiveModalSantriId(
                                                displayedStudents[activeStudentIndex + 1].santri.id
                                            );
                                        }
                                    }}
                                    title="Santri berikutnya"
                                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 shrink-0"
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>

                                <div className="min-w-0 ml-1">
                                    <h3 className="text-sm font-bold text-slate-900 truncate">
                                        {activeStudentTranscript.santri.namaLengkap}
                                    </h3>
                                    <div className="text-xs text-slate-500 flex items-center gap-1.5 tabular-nums">
                                        <span>NIS {activeStudentTranscript.santri.nis || '-'}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{activeStudentTranscript.recordedSemesterCount} Semester Terdata</span>
                                        {activeStudentIndex >= 0 && (
                                            <>
                                                <span aria-hidden="true">·</span>
                                                <span>
                                                    {activeStudentIndex + 1} / {displayedStudents.length}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleExportSingleExcel(activeStudentTranscript)}
                                    disabled={isExportingSingle}
                                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                >
                                    <i className="bi bi-file-earmark-excel text-emerald-600"></i>
                                    <span>Unduh Excel</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePrintSingle(activeStudentTranscript)}
                                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                >
                                    <i className="bi bi-printer-fill"></i>
                                    <span>Cetak / Simpan PDF</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveModalSantriId(null)}
                                    aria-label="Tutup pratinjau transkrip"
                                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>

                        {/* Print Configuration Strip */}
                        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Mode:</span>
                                <select
                                    value={printPrefs.docMode}
                                    onChange={e => updatePref('docMode', e.target.value as TranscriptDocMode)}
                                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-semibold text-slate-800"
                                >
                                    <option value="transkrip">Transkrip Kumulatif</option>
                                    <option value="buku_induk_6">Buku Induk (6 Semester)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Kertas:</span>
                                <select
                                    value={printPrefs.paperSize}
                                    onChange={e => updatePref('paperSize', e.target.value as 'A4' | 'F4')}
                                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium text-slate-800"
                                >
                                    <option value="A4">A4</option>
                                    <option value="F4">F4 / Folio</option>
                                </select>
                                <select
                                    value={printPrefs.orientation}
                                    onChange={e =>
                                        updatePref('orientation', e.target.value as 'portrait' | 'landscape')
                                    }
                                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium text-slate-800"
                                >
                                    <option value="portrait">Tegak (Portrait)</option>
                                    <option value="landscape">Mendatar (Landscape)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">No. Surat:</span>
                                <input
                                    type="text"
                                    value={printPrefs.nomorDokumen}
                                    onChange={e => updatePref('nomorDokumen', e.target.value)}
                                    placeholder="Opsional (mis. 421/TRK/2026)"
                                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 w-44"
                                />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Titimangsa:</span>
                                <input
                                    type="text"
                                    value={printPrefs.tempatCetak}
                                    onChange={e => updatePref('tempatCetak', e.target.value)}
                                    placeholder="Kota"
                                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 w-28"
                                />
                                <input
                                    type="date"
                                    value={printPrefs.tanggalCetak}
                                    onChange={e => updatePref('tanggalCetak', e.target.value)}
                                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800"
                                />
                                <select
                                    value={printPrefs.dateFormatMode}
                                    onChange={e => updatePref('dateFormatMode', e.target.value as DateFormatMode)}
                                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800"
                                >
                                    <option value="masehi">Masehi</option>
                                    <option value="hijriah_masehi">Hijriah &amp; Masehi</option>
                                    <option value="hijriah">Hijriah</option>
                                </select>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={printPrefs.groupByRumpun}
                                        onChange={e => updatePref('groupByRumpun', e.target.checked)}
                                        className="rounded border-slate-300 text-teal-600"
                                    />
                                    <span>Kelompok Rumpun</span>
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={printPrefs.showKop}
                                        onChange={e => updatePref('showKop', e.target.checked)}
                                        className="rounded border-slate-300 text-teal-600"
                                    />
                                    <span>Kop</span>
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={printPrefs.showPhoto}
                                        onChange={e => updatePref('showPhoto', e.target.checked)}
                                        className="rounded border-slate-300 text-teal-600"
                                    />
                                    <span>Pasfoto</span>
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={printPrefs.showTahfizh}
                                        onChange={e => updatePref('showTahfizh', e.target.checked)}
                                        className="rounded border-slate-300 text-teal-600"
                                    />
                                    <span>Tahfizh</span>
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={printPrefs.showDigitalTtd}
                                        onChange={e => updatePref('showDigitalTtd', e.target.checked)}
                                        className="rounded border-slate-300 text-teal-600"
                                    />
                                    <span>TTD &amp; Cap Digital</span>
                                </label>
                            </div>
                        </div>

                        {/* Printable Document Canvas */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
                            <div id="single-transcript-print-area">
                                <PrintableTranscriptDocument
                                    data={activeStudentTranscript}
                                    settings={settings}
                                    digitalAssets={digitalAssets}
                                    options={printPrefs}
                                    isLastDocument={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Pratinjau Cetak Masal Transkrip / Buku Induk */}
            {isBatchPrintOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col border border-slate-200 shadow-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Pratinjau Cetak Masal{' '}
                                    {printPrefs.docMode === 'buku_induk_6'
                                        ? 'Buku Induk Nilai (6 Semester)'
                                        : 'Transkrip Akademik Kumulatif'}
                                </h3>
                                <p className="text-xs text-slate-500 tabular-nums">
                                    {cohortTitleLabel} · {selectedBatchStudents.length} Dokumen Santri · Kertas{' '}
                                    {printPrefs.paperSize} ({printPrefs.orientation === 'landscape' ? 'Mendatar' : 'Tegak'})
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleTriggerBatchPrint}
                                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                >
                                    <i className="bi bi-printer-fill"></i>
                                    <span>Cetak Semua ({selectedBatchStudents.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsBatchPrintOpen(false)}
                                    aria-label="Tutup cetak masal"
                                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
                            <div id="batch-transcript-print-area">
                                {selectedBatchStudents.map((studentData, idx) => (
                                    <PrintableTranscriptDocument
                                        key={studentData.santri.id}
                                        data={studentData}
                                        settings={settings}
                                        digitalAssets={digitalAssets}
                                        options={printPrefs}
                                        isLastDocument={idx === selectedBatchStudents.length - 1}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Transkrip & Buku Induk"
                onReset={() => {
                    if (!isWaliKelas) {
                        setSelectedJenjangId('');
                        setSelectedKelasId('');
                        setSelectedRombelId('');
                    }
                    setSantriStatusFilter('Aktif');
                    setJenjangScope('active_jenjang');
                }}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Marhalah / Jenjang</label>
                        <select
                            value={selectedJenjangId}
                            onChange={e => {
                                setSelectedJenjangId(e.target.value);
                                setSelectedKelasId('');
                                setSelectedRombelId('');
                            }}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium"
                        >
                            {!isWaliKelas && <option value="">Semua Jenjang</option>}
                            {availableJenjangList.map(j => (
                                <option key={j.id} value={j.id}>
                                    {j.nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Tingkat Kelas</label>
                        <select
                            value={selectedKelasId}
                            onChange={e => {
                                setSelectedKelasId(e.target.value);
                                setSelectedRombelId('');
                            }}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium"
                        >
                            {!isWaliKelas && <option value="">Semua Kelas</option>}
                            {filteredKelasList.map(k => (
                                <option key={k.id} value={k.id}>
                                    {k.nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Rombongan Belajar</label>
                        <select
                            value={selectedRombelId}
                            onChange={e => setSelectedRombelId(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold bg-slate-50"
                        >
                            {!isWaliKelas && <option value="">Semua Rombel (Angkatan)</option>}
                            {filteredRombelList.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Status Santri</label>
                        <select
                            value={santriStatusFilter}
                            onChange={e => setSantriStatusFilter(e.target.value as any)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium"
                        >
                            <option value="Aktif">Santri Aktif</option>
                            <option value="Lulus">Lulus / Alumni</option>
                            <option value="Keluar/Pindah">Mutasi / Pindah</option>
                            <option value="all">Semua Status</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Cakupan Riwayat Nilai</label>
                        <select
                            value={jenjangScope}
                            onChange={e => setJenjangScope(e.target.value as TranscriptJenjangScope)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium"
                        >
                            <option value="active_jenjang">Khusus Jenjang Saat Ini</option>
                            <option value="all">Gabung Lintas Semua Jenjang</option>
                        </select>
                    </div>
                </div>
            </MobileFilterDrawer>
        </div>
    );
};
