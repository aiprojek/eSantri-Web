import React from 'react';
import { PondokSettings, PiketSchedule, Santri, PiketPrintConfig } from '../../types';
import { formatDate, getHijriDate, formatLocalDate, resolveTempatPesantren, toArabicNumerals } from '../../utils/formatters';

interface PiketPrintTemplateProps {
    settings: PondokSettings;
    weekDates: string[]; // 7 ISO date strings (Monday to Sunday)
    piketList: PiketSchedule[];
    santriList: Santri[];
    customTempat?: string;
    piketConfig?: PiketPrintConfig;
}

export const PiketPrintTemplate: React.FC<PiketPrintTemplateProps> = ({
    settings,
    weekDates,
    piketList,
    santriList,
    customTempat,
    piketConfig,
}) => {
    const sholatList = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const;
    const daysName = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const getSantriName = (id?: number) => {
        if (!id) return '-';
        const s = santriList.find(santri => santri.id === id);
        return s ? s.namaLengkap : '-';
    };

    const startDate = weekDates[0];
    const endDate = weekDates[weekDates.length - 1];

    const hijriStart = startDate ? getHijriDate(new Date(startDate), settings.hijriAdjustment || 0) : null;
    const hijriEnd = endDate ? getHijriDate(new Date(endDate), settings.hijriAdjustment || 0) : null;

    const periodMasehi = startDate && endDate
        ? `${formatDate(startDate)} s/d ${formatDate(endDate)}`
        : '';
    const periodHijri = hijriStart && hijriEnd
        ? `${hijriStart.day} ${hijriStart.month} - ${hijriEnd.day} ${hijriEnd.month} ${hijriEnd.year} H`
        : '';

    const tempatSurat = piketConfig?.tempat?.trim() || customTempat?.trim() || resolveTempatPesantren(settings);
    const showKetentuan = piketConfig?.showKetentuan !== false;
    const showTandaTangan = piketConfig?.showTandaTangan !== false;

    const rules = (piketConfig?.ketentuanList && piketConfig.ketentuanList.length > 0)
        ? piketConfig.ketentuanList
        : [
            '1. Muadzin hadir di masjid sekurang-kurangnya 10 menit sebelum waktu adzan tiba.',
            '2. Muadzin mengumandangkan iqomah setelah jeda sholat sunnah qabliyah (3-5 menit).',
            '3. Imam santri bertugas sebagai latihan kepemimpinan ibadah & imam badal jika asatidz udzur.',
            '4. Petugas yang berhalangan wajib lapor pengurus asrama dan mencari santri badal (pengganti).'
        ];

    const rawLeftName = piketConfig?.leftName?.trim() || settings.namaMudir?.trim() || '';
    const leftNameStr = rawLeftName ? (rawLeftName.startsWith('(') ? rawLeftName : `( ${rawLeftName} )`) : '( ........................................... )';
    const leftTitle = piketConfig?.leftTitle?.trim() || 'Pengasuh / Pimpinan Pondok';

    const rawRightName = piketConfig?.rightName?.trim() || '';
    const rightNameStr = rawRightName ? (rawRightName.startsWith('(') ? rawRightName : `( ${rawRightName} )`) : '( ........................................... )';
    const rightTitle = piketConfig?.rightTitle?.trim() || 'Bagian Keasramaan & Ibadah';

    return (
        <div className="w-[297mm] min-h-[210mm] p-6 mx-auto bg-white text-gray-900 font-sans print:w-full print:p-2 print:shadow-none print:m-0">
            <style>{`
                @page {
                    size: A4 landscape;
                    margin: 8mm;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Kop Surat */}
            <div className="flex items-center gap-4 border-b-2 border-gray-800 pb-2.5 mb-3">
                {(settings.logoPonpesUrl || settings.logoYayasanUrl) && (
                    <img
                        src={settings.logoPonpesUrl || settings.logoYayasanUrl}
                        alt="Logo"
                        className="w-14 h-14 object-contain shrink-0"
                    />
                )}
                <div className="flex-1 text-center">
                    <h1 className="text-lg font-bold uppercase tracking-wider text-gray-900 leading-tight">
                        {settings.namaPonpes || 'PONDOK PESANTREN'}
                    </h1>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                        {settings.alamat || 'Alamat Pesantren'}
                    </p>
                    {settings.telepon && (
                        <p className="text-[10px] text-gray-500">
                            Telp / Kontak: {settings.telepon}
                        </p>
                    )}
                </div>
            </div>

            {/* Judul & Periode */}
            <div className="text-center my-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-teal-900 border-b inline-block pb-0.5 border-teal-700">
                    JADWAL PETUGAS ADZAN & IMAM SHOLAT FARDHU
                </h2>
                <div className="text-xs text-gray-700 font-semibold mt-0.5">
                    Periode: {periodMasehi}
                </div>
                {periodHijri && (
                    <div className="text-[10px] text-teal-800 font-medium">
                        ( {periodHijri} )
                    </div>
                )}
            </div>

            {/* Tabel Jadwal Mingguan */}
            <div className="mt-2.5 overflow-hidden border border-gray-400 rounded-md">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                    <thead>
                        <tr className="bg-teal-800 text-white font-bold">
                            <th className="border border-teal-900 p-2 w-[15%]">Hari / Tanggal</th>
                            {sholatList.map(sholat => (
                                <th key={sholat} className="border border-teal-900 p-2 w-[17%]">
                                    <div className="text-xs uppercase">{sholat}</div>
                                    <div className="text-[9.5px] font-normal text-teal-100 border-t border-teal-700/60 mt-0.5 pt-0.5">
                                        Muadzin & Imam
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                        {weekDates.map((dateStr, idx) => {
                            const d = new Date(dateStr + 'T00:00:00');
                            const dayName = daysName[d.getDay()];
                            const isFriday = d.getDay() === 5;
                            const isSunday = d.getDay() === 0;
                            const hijri = getHijriDate(d, settings.hijriAdjustment || 0);

                            return (
                                <tr
                                    key={dateStr}
                                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                                        isFriday ? 'border-l-4 border-l-teal-600' : ''
                                    }`}
                                >
                                    <td className="p-2 border border-gray-300 font-semibold text-left align-middle bg-gray-100/60">
                                        <div className={`font-bold text-xs ${isSunday ? 'text-red-600' : isFriday ? 'text-teal-800' : 'text-gray-900'}`}>
                                            {dayName}
                                        </div>
                                        <div className="text-[10px] text-gray-700 font-medium">
                                            {formatDate(dateStr)}
                                        </div>
                                        {hijri.day && (
                                            <div className="text-[9px] text-teal-800 font-medium mt-0.5">
                                                {hijri.day} {hijri.month}
                                            </div>
                                        )}
                                    </td>
                                    {sholatList.map(sholat => {
                                        const item = piketList.find(
                                            p => p.tanggal === dateStr && p.sholat === sholat
                                        );
                                        const muadzin = getSantriName(item?.muadzinSantriId);
                                        const imam = getSantriName(item?.imamSantriId);

                                        return (
                                            <td key={sholat} className="p-1.5 border border-gray-300 align-middle">
                                                <div className="flex flex-col gap-1 text-[10px] leading-tight text-left">
                                                    <div 
                                                        className="px-1.5 py-0.5 bg-teal-50/90 rounded text-teal-950 flex items-start gap-1 border border-teal-200/70"
                                                        title={`Muadzin: ${muadzin}`}
                                                    >
                                                        <span className="font-bold text-teal-700 text-[8.5px] shrink-0 pt-0.5">M:</span>
                                                        <span className="font-medium break-words leading-tight min-w-0">{muadzin}</span>
                                                    </div>
                                                    <div 
                                                        className="px-1.5 py-0.5 bg-amber-50/90 rounded text-amber-950 flex items-start gap-1 border border-amber-200/70"
                                                        title={`Imam: ${imam}`}
                                                    >
                                                        <span className="font-bold text-amber-800 text-[8.5px] shrink-0 pt-0.5">I :</span>
                                                        <span className="font-medium break-words leading-tight min-w-0">{imam}</span>
                                                    </div>
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

            {/* Tata Tertib / Ketentuan */}
            {showKetentuan && (
                <div className="mt-3 p-2.5 bg-gray-50 border border-gray-300 rounded-md text-[10.5px] text-gray-700">
                    <div className="font-bold text-gray-900 text-[11px] flex items-center gap-1.5 mb-1">
                        <span>📌</span> {piketConfig?.judulKetentuan?.trim() || 'KETENTUAN PETUGAS SHOLAT FARDHU:'}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                        {rules.map((rule, rIdx) => (
                            <div key={rIdx}>{rule}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tanda Tangan */}
            {showTandaTangan && (
                <div className="mt-4 flex justify-between items-start text-xs text-gray-800">
                    <div className="text-center w-56">
                        <p>Mengetahui,</p>
                        <p className="font-bold">{leftTitle}</p>
                        <div className="h-12"></div>
                        <p className="font-bold underline uppercase">
                            {leftNameStr}
                        </p>
                    </div>
                    <div className="text-center w-56">
                        <p>{tempatSurat}, {formatDate(formatLocalDate(new Date()))}</p>
                        <p className="font-bold">{rightTitle}</p>
                        <div className="h-12"></div>
                        <p className="font-bold underline uppercase">
                            {rightNameStr}
                        </p>
                    </div>
                </div>
            )}

            {/* Watermark Footer */}
            <div className="mt-3 pt-1 border-t border-gray-300 text-[8.5px] text-gray-400 flex justify-between">
                <span>Dokumen Resmi Jadwal Piket Ibadah Santri</span>
                <span>dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</span>
            </div>
        </div>
    );
};
