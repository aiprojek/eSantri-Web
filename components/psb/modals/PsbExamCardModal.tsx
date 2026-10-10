import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Pendaftar, PondokSettings } from '../../../types';
import { getPsbRegistrationNumber, openWhatsappChat, generatePsbExamScheduleMessage, healPendaftarRecord, getPendaftarPhone } from '../utils/psbUtils';
import { printToPdfNative } from '../../../utils/pdfGenerator';
import { useAppContext } from '../../../AppContext';

interface PsbExamCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftar?: Pendaftar | null;
    pendaftarList?: Pendaftar[];
    settings: PondokSettings;
}

export const PsbExamCardModal: React.FC<PsbExamCardModalProps> = ({
    isOpen,
    onClose,
    pendaftar: rawPendaftar,
    pendaftarList: rawPendaftarList,
    settings
}) => {
    const { showToast } = useAppContext();
    const [qrCodeMap, setQrCodeMap] = useState<Record<number, string>>({});
    const [tanggalUjian, setTanggalUjian] = useState<string>('');
    const [ruangUjian, setRuangUjian] = useState<string>('Ruang Seleksi Posko 1');
    const [catatan] = useState<string>('Harap hadir 15 menit sebelum waktu ujian');
    const printAreaRef = useRef<HTMLDivElement>(null);

    const items = (rawPendaftarList && rawPendaftarList.length > 0
        ? rawPendaftarList
        : rawPendaftar
            ? [rawPendaftar]
            : []
    ).map(p => healPendaftarRecord(p));

    useEffect(() => {
        if (!isOpen || items.length === 0) return;

        let cancelled = false;
        const generateAllQrCodes = async () => {
            const newMap: Record<number, string> = {};
            for (const p of items) {
                const jenjang = settings.jenjang.find(j => j.id === p.jenjangId)?.nama || '-';
                const noReg = p.nomorRegistrasi || getPsbRegistrationNumber(p, jenjang);
                const qrPayload = JSON.stringify({
                    noReg,
                    nama: p.namaLengkap,
                    jenjang,
                    jalur: p.jalurPendaftaran || 'Reguler',
                    ponpes: settings.namaPonpes
                });
                try {
                    const url = await QRCode.toDataURL(qrPayload, { width: 140, margin: 1 });
                    newMap[p.id] = url;
                } catch (err) {
                    console.error('Failed to generate QR code', err);
                }
            }
            if (!cancelled) {
                setQrCodeMap(newMap);
            }
        };

        generateAllQrCodes();

        const first = items[0];
        if (first.nilaiUjian?.tanggalUjian) {
            setTanggalUjian(first.nilaiUjian.tanggalUjian.split('T')[0]);
        } else {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            setTanggalUjian(d.toISOString().split('T')[0]);
        }

        if (first.nilaiUjian?.ruangUjian) {
            setRuangUjian(first.nilaiUjian.ruangUjian);
        }

        return () => {
            cancelled = true;
        };
    }, [isOpen, rawPendaftar, rawPendaftarList, settings]);

    if (!isOpen || items.length === 0) return null;

    const isBulk = items.length > 1;
    const firstPendaftar = items[0];
    const firstJenjang = settings.jenjang.find(j => j.id === firstPendaftar.jenjangId)?.nama || '-';
    const firstNoReg = firstPendaftar.nomorRegistrasi || getPsbRegistrationNumber(firstPendaftar, firstJenjang);

    const handlePrint = () => {
        if (isBulk) {
            printToPdfNative('psb-exam-card', `Kartu_Ujian_PSB_Massal_${items.length}_Peserta_${new Date().toISOString().slice(0, 10)}`, {
                paperSize: 'A4',
                orientation: 'portrait'
            });
        } else {
            const cleanName = (firstPendaftar.namaLengkap || 'Santri').replace(/[^a-zA-Z0-9_-]/g, '_');
            printToPdfNative('psb-exam-card', `Kartu_Ujian_PSB_${firstNoReg}_${cleanName}`, {
                paperSize: 'A4',
                orientation: 'portrait'
            });
        }
    };

    const handleSendWa = (pendaftar: Pendaftar) => {
        const phone = getPendaftarPhone(pendaftar);
        const msg = generatePsbExamScheduleMessage(pendaftar, settings, {
            tanggalUjian,
            ruangUjian,
            catatan
        });
        const ok = openWhatsappChat(phone, msg);
        if (!ok) {
            showToast('Nomor telepon/WhatsApp wali belum diisi atau tidak valid. Silakan lengkapi di Edit Pendaftar.', 'error');
        }
    };

    return createPortal(
        <div className="print-modal-target fixed inset-0 bg-black/60 z-[80] flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
            <div className="print-modal-card bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden my-auto border border-gray-100">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-teal-800 text-white no-print">
                    <div className="flex items-center gap-2.5">
                        <i className="bi bi-card-heading text-2xl text-teal-200"></i>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">
                                {isBulk
                                    ? `Cetak Massal Kartu Ujian Seleksi PSB — ${items.length} Peserta`
                                    : 'Kartu Tanda Peserta Ujian Seleksi PSB'}
                            </h3>
                            <p className="text-xs text-teal-100">
                                {isBulk
                                    ? 'Setiap kartu peserta ujian otomatis terpisah per halaman saat dicetak'
                                    : 'Siap dicetak sebagai kartu fisik / pass ujian calon santri'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700/50 transition-colors"
                        title="Tutup Modal"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Control Bar (No Print) */}
                <div className="p-4 bg-teal-50/70 border-b border-teal-100/60 no-print flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                        {isBulk && (
                            <span className="bg-purple-700 text-white px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                                {items.length} Peserta Terpilih
                            </span>
                        )}
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-gray-700">Tgl Ujian:</label>
                            <input
                                type="date"
                                value={tanggalUjian}
                                onChange={(e) => setTanggalUjian(e.target.value)}
                                className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-gray-700">Ruang/Meja:</label>
                            <input
                                type="text"
                                value={ruangUjian}
                                onChange={(e) => setRuangUjian(e.target.value)}
                                className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500 w-36"
                                placeholder="Ruang Seleksi"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isBulk && (
                            <button
                                onClick={() => handleSendWa(firstPendaftar)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <i className="bi bi-whatsapp"></i> Kirim ke Wali
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                            <i className="bi bi-printer-fill"></i> {isBulk ? `Cetak Semua Kartu (${items.length})` : 'Cetak Kartu'}
                        </button>
                    </div>
                </div>

                {/* Printable Exam Card Sheet - items-start & h-fit ensures card expands cleanly without clipping */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center justify-start print:p-0 print:bg-white print:overflow-visible">
                    <div
                        ref={printAreaRef}
                        id="psb-exam-card"
                        className="w-full max-w-2xl h-fit mx-auto space-y-6 print:space-y-0"
                    >
                        {items.map((pendaftar) => {
                            const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
                            const noReg = pendaftar.nomorRegistrasi || getPsbRegistrationNumber(pendaftar, jenjang);
                            const qrCodeUrl = qrCodeMap[pendaftar.id] || '';
                            const waliPhone = getPendaftarPhone(pendaftar);

                            return (
                                <div
                                    key={pendaftar.id}
                                    className="psb-exam-card-sheet bg-white border-2 border-dashed border-gray-400 p-6 sm:p-8 rounded-xl shadow-md w-full h-fit mx-auto text-gray-900 print:shadow-none print:border-solid print:border-black print:m-0 print:p-6"
                                >
                                    {/* Kop Pesantren */}
                                    <div className="border-b-2 border-double border-gray-800 pb-3 mb-4 flex items-center gap-4">
                                        {(settings.logoPonpesUrl || settings.logoYayasanUrl) ? (
                                            <img
                                                src={settings.logoPonpesUrl || settings.logoYayasanUrl}
                                                alt="Logo"
                                                className="w-16 h-16 object-contain rounded-full border border-gray-200 p-0.5"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-teal-800 text-white flex items-center justify-center text-2xl font-black shrink-0">
                                                <i className="bi bi-building"></i>
                                            </div>
                                        )}
                                        <div className="flex-grow text-center">
                                            <h2 className="text-lg font-black tracking-tight text-gray-900 uppercase">
                                                {settings.namaPonpes || 'PONDOK PESANTREN'}
                                            </h2>
                                            <p className="text-xs text-gray-600 leading-tight">
                                                {settings.alamat || 'Alamat Pesantren Belum Diatur'}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                {settings.telepon ? `Telp: ${settings.telepon}` : ''}{' '}
                                                {settings.email ? `| Email: ${settings.email}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Judul Kartu */}
                                    <div className="text-center mb-4">
                                        <div className="inline-block bg-teal-50 border border-teal-200 px-4 py-1 rounded-full">
                                            <h3 className="text-xs sm:text-sm font-black text-teal-900 uppercase tracking-wide">
                                                KARTU TANDA PESERTA UJIAN SELEKSI MASUK
                                            </h3>
                                        </div>
                                        <p className="text-[11px] text-gray-600 mt-1">
                                            Penerimaan Santri Baru (PSB) Tahun Ajaran {settings.psbConfig?.tahunAjaranAktif || new Date().getFullYear()}
                                        </p>
                                    </div>

                                    {/* Body Kartu: Data Calon Santri & QR */}
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3.5 bg-slate-50 rounded-xl border border-gray-200 mb-4">
                                        {/* QR & Photo Box */}
                                        <div className="sm:col-span-1 flex flex-col items-center justify-center gap-2 bg-white p-2.5 rounded-lg border border-gray-200">
                                            {qrCodeUrl ? (
                                                <img
                                                    src={qrCodeUrl}
                                                    alt="QR Code Registrasi"
                                                    className="w-24 h-24 object-contain rounded"
                                                />
                                            ) : (
                                                <div className="w-24 h-24 bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center p-1">
                                                    QR Code
                                                </div>
                                            )}
                                            <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                                {noReg}
                                            </span>
                                        </div>

                                        {/* Data Santri Details */}
                                        <div className="sm:col-span-3 space-y-1.5 text-xs text-gray-700">
                                            <div className="grid grid-cols-3 gap-1">
                                                <span className="font-semibold text-gray-500">Nama Lengkap</span>
                                                <span className="col-span-2 font-bold text-gray-900 text-sm">{pendaftar.namaLengkap}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                <span className="font-semibold text-gray-500">No. Registrasi</span>
                                                <span className="col-span-2 font-mono font-bold text-teal-900">{noReg}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                <span className="font-semibold text-gray-500">NISN / NIK</span>
                                                <span className="col-span-2 font-mono">{pendaftar.nisn || pendaftar.nik || '-'}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                <span className="font-semibold text-gray-500">Jenjang / Jalur</span>
                                                <span className="col-span-2 font-medium">
                                                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[11px] font-semibold mr-1.5">
                                                        {jenjang}
                                                    </span>
                                                    {pendaftar.jalurPendaftaran || 'Reguler'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                <span className="font-semibold text-gray-500">Jenis Kelamin</span>
                                                <span className="col-span-2">{pendaftar.jenisKelamin}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                <span className="font-semibold text-gray-500">Asal Sekolah</span>
                                                <span className="col-span-2">{pendaftar.asalSekolah || pendaftar.sekolahAsal || '-'}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                <span className="font-semibold text-gray-500">Wali / No. HP</span>
                                                <span className="col-span-2">{pendaftar.namaWali || pendaftar.namaAyah || '-'} ({waliPhone || '-'})</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Jadwal & Lokasi Ujian */}
                                    <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 mb-4 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <span className="font-bold text-teal-900 block">Jadwal Ujian:</span>
                                                <span className="font-medium text-gray-800">
                                                    {tanggalUjian ? new Date(tanggalUjian).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-bold text-teal-900 block">Ruang / Lokasi:</span>
                                                <span className="font-medium text-gray-800">{ruangUjian || 'Posko PSB'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lembar Verifikasi Penilaian Posko */}
                                    <div className="mb-4">
                                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                            <i className="bi bi-pencil-square text-teal-700"></i> Lembar Verifikasi & Nilai Penguji
                                        </h4>
                                        <table className="w-full text-xs border border-gray-300 rounded-lg overflow-hidden">
                                            <thead className="bg-gray-100 text-gray-700 font-semibold text-[11px]">
                                                <tr>
                                                    <th className="p-2 border border-gray-300 text-center w-8">No</th>
                                                    <th className="p-2 border border-gray-300 text-left">Materi Ujian</th>
                                                    <th className="p-2 border border-gray-300 text-center w-24">Skor (0-100)</th>
                                                    <th className="p-2 border border-gray-300 text-center w-36">Paraf Penguji</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 text-gray-800">
                                                <tr>
                                                    <td className="p-1.5 border border-gray-300 text-center">1</td>
                                                    <td className="p-1.5 border border-gray-300">Tes Baca Al-Qur'an (Tahsin & Tajwid)</td>
                                                    <td className="p-1.5 border border-gray-300 text-center font-bold">
                                                        {pendaftar.nilaiUjian?.bacaQuran ?? '........'}
                                                    </td>
                                                    <td className="p-1.5 border border-gray-300 text-center text-gray-400">...................</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-1.5 border border-gray-300 text-center">2</td>
                                                    <td className="p-1.5 border border-gray-300">Tes Hafalan Al-Qur'an (Tahfizh)</td>
                                                    <td className="p-1.5 border border-gray-300 text-center font-bold">
                                                        {pendaftar.nilaiUjian?.tahfizh ?? '........'}
                                                    </td>
                                                    <td className="p-1.5 border border-gray-300 text-center text-gray-400">...................</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-1.5 border border-gray-300 text-center">3</td>
                                                    <td className="p-1.5 border border-gray-300">Tes Diniyah & Pengetahuan Dasar</td>
                                                    <td className="p-1.5 border border-gray-300 text-center font-bold">
                                                        {pendaftar.nilaiUjian?.akademik ?? '........'}
                                                    </td>
                                                    <td className="p-1.5 border border-gray-300 text-center text-gray-400">...................</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-1.5 border border-gray-300 text-center">4</td>
                                                    <td className="p-1.5 border border-gray-300">Wawancara Kesiapan Santri & Wali</td>
                                                    <td className="p-1.5 border border-gray-300 text-center font-bold">
                                                        {pendaftar.nilaiUjian?.wawancara ?? '........'}
                                                    </td>
                                                    <td className="p-1.5 border border-gray-300 text-center text-gray-400">...................</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Catatan Tata Tertib */}
                                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg mb-6 text-[10px] text-amber-900 leading-relaxed">
                                        <p className="font-bold mb-1">Tata Tertib Peserta Ujian:</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            <li>Wajib membawa kartu peserta ujian fisik ini saat hadir di posko pesantren.</li>
                                            <li>Membawa fotokopi berkas fisik (KK, Akta Kelahiran, SKL/Ijazah, dan Surat Sehat).</li>
                                            <li>Berpakaian rapi, bersih, sopan, dan menutup aurat (busana muslim/muslimah).</li>
                                            <li>Hadir minimal 15 menit sebelum pelaksanaan ujian dimulai.</li>
                                        </ul>
                                    </div>

                                    {/* Tanda Tangan */}
                                    <div className="grid grid-cols-2 gap-4 text-center text-xs mt-6 pt-2">
                                        <div>
                                            <p className="text-gray-500">Calon Santri / Wali,</p>
                                            <div className="h-14"></div>
                                            <p className="font-bold border-t border-gray-400 inline-block px-4 pt-1">
                                                {pendaftar.namaLengkap}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Panitia PSB Posko,</p>
                                            <div className="h-14"></div>
                                            <p className="font-bold border-t border-gray-400 inline-block px-4 pt-1">
                                                (.........................................)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="p-3.5 sm:p-4 border-t bg-gray-50 flex justify-end gap-2 no-print">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold border border-gray-300 transition-colors"
                    >
                        Tutup
                    </button>
                    {!isBulk && (
                        <button
                            type="button"
                            onClick={() => handleSendWa(firstPendaftar)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                            <i className="bi bi-whatsapp"></i> Bagikan Info ke WhatsApp
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                        <i className="bi bi-printer-fill"></i> {isBulk ? `Cetak Semua Kartu (${items.length})` : 'Cetak Kartu'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
