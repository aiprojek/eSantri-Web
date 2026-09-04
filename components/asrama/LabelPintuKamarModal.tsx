import React, { useRef } from 'react';
import { Kamar, GedungAsrama, Santri, PondokSettings } from '../../types';

interface LabelPintuKamarModalProps {
    isOpen: boolean;
    onClose: () => void;
    kamar: Kamar | null;
    gedung: GedungAsrama | null;
    penghuni: Santri[];
    settings: PondokSettings;
}

export const LabelPintuKamarModal: React.FC<LabelPintuKamarModalProps> = ({
    isOpen,
    onClose,
    kamar,
    gedung,
    penghuni,
    settings
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !kamar || !gedung) return null;

    const musyrif = settings.tenagaPengajar.find(tp => tp.id === kamar.musyrifId);
    const ketuaKamar = penghuni.find(s => s.id === kamar.ketuaKamarId) || (penghuni.length > 0 && kamar.ketuaKamarId ? null : null);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
                {/* Header Modal (Hidden in Print) */}
                <div className="p-4 bg-teal-800 text-white flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                        <i className="bi bi-printer-fill text-xl text-teal-200"></i>
                        <div>
                            <h3 className="font-bold text-base">Cetak Label Pintu Kamar (Door Tag)</h3>
                            <p className="text-xs text-teal-100">{gedung.nama} &bull; {kamar.nama}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                        >
                            <i className="bi bi-printer"></i> Cetak / Print Sekarang
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-teal-700/50 transition-colors"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Printable Content Area */}
                <div ref={printRef} className="p-6 sm:p-8 bg-white text-gray-900 print:p-6 print:m-0">
                    {/* Kop Pesantren */}
                    <div className="border-b-2 border-teal-900 pb-4 mb-4 text-center relative">
                        {settings.logoPonpesUrl && (
                            <img
                                src={settings.logoPonpesUrl}
                                alt="Logo Pesantren"
                                className="w-16 h-16 object-contain absolute left-0 top-1/2 -translate-y-1/2 hidden sm:block print:block"
                            />
                        )}
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-teal-950">
                            {settings.namaPonpes || 'PONDOK PESANTREN MODERN'}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-700 font-medium">
                            {settings.alamat || 'Alamat Lembaga Pendidikan Pesantren'} &bull; Telp: {settings.telepon || '-'}
                        </p>
                        <p className="text-[11px] text-teal-800 font-semibold tracking-widest uppercase mt-0.5">
                            BAGIAN PENGASUHAN SANTRI &amp; KEASRAMAAN
                        </p>
                    </div>

                    {/* Badge & Room Identification */}
                    <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-2 border-teal-800/40 rounded-xl p-4 mb-5 text-center shadow-2xs">
                        <div className="inline-block px-3 py-1 bg-teal-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-1">
                            {gedung.jenis === 'Putra' ? 'ASRAMA SANTRIWAN (BANIN)' : 'ASRAMA SANTRIWATI (BANAT)'} &bull; {kamar.lantai || 'Lantai 1'}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-teal-950 mt-1">
                            {kamar.nama}
                        </h1>
                        <p className="text-xs font-semibold text-teal-800">
                            Gedung: {gedung.nama}
                        </p>
                    </div>

                    {/* Info Musyrif & Ketua Kamar */}
                    <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Musyrif / Pembina Kamar:</span>
                            <span className="font-bold text-teal-950 text-sm flex items-center gap-1 mt-0.5">
                                <i className="bi bi-person-badge text-teal-700"></i> {musyrif?.nama || 'Belum Ditentukan'}
                            </span>
                            {musyrif?.telepon && <span className="text-[10px] text-gray-500 block">Kontak: {musyrif.telepon}</span>}
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Ketua Kamar (Rais Ghorfah):</span>
                            <span className="font-bold text-teal-950 text-sm flex items-center gap-1 mt-0.5">
                                <i className="bi bi-star-fill text-amber-500"></i> {ketuaKamar?.namaLengkap || (penghuni.find(s => s.id === kamar.ketuaKamarId)?.namaLengkap) || 'Belum Dipilih'}
                            </span>
                            <span className="text-[10px] text-gray-500 block">Kapasitas: {penghuni.length} / {kamar.kapasitas} Santri</span>
                        </div>
                    </div>

                    {/* Table Penghuni Kamar */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-teal-900 text-white font-bold text-[11px] uppercase tracking-wider">
                                    <th className="py-2.5 px-3 border-r border-teal-800 w-10 text-center">No</th>
                                    <th className="py-2.5 px-3 border-r border-teal-800 w-28">NIS</th>
                                    <th className="py-2.5 px-3 border-r border-teal-800">Nama Lengkap Santri</th>
                                    <th className="py-2.5 px-3 border-r border-teal-800 w-24 text-center">Kelas / Rombel</th>
                                    <th className="py-2.5 px-3 w-32">Asal Kota / Daerah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-800">
                                {penghuni.map((santri, index) => {
                                    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
                                    const isRais = santri.id === kamar.ketuaKamarId;
                                    return (
                                        <tr key={santri.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                                            <td className="py-2 px-3 border-r border-gray-200 text-center font-bold text-gray-600">
                                                {index + 1}
                                            </td>
                                            <td className="py-2 px-3 border-r border-gray-200 font-mono text-gray-700">
                                                {santri.nis}
                                            </td>
                                            <td className="py-2 px-3 border-r border-gray-200 font-semibold text-gray-900 flex items-center justify-between">
                                                <span>{santri.namaLengkap}</span>
                                                {isRais && (
                                                    <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-bold rounded">
                                                        Ketua Kamar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 border-r border-gray-200 text-center text-gray-700">
                                                {rombel?.nama || '-'}
                                            </td>
                                            <td className="py-2 px-3 text-gray-700 truncate max-w-[120px]">
                                                {santri.alamat?.kabupatenKota || santri.tempatLahir || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Empty Slot Rows if room has remaining capacity */}
                                {Array.from({ length: Math.max(0, kamar.kapasitas - penghuni.length) }).map((_, i) => (
                                    <tr key={`empty-${i}`} className="bg-gray-50/40 text-gray-400 italic">
                                        <td className="py-2 px-3 border-r border-gray-200 text-center font-normal">{penghuni.length + i + 1}</td>
                                        <td className="py-2 px-3 border-r border-gray-200">-</td>
                                        <td className="py-2 px-3 border-r border-gray-200">[ Slot Kosong ]</td>
                                        <td className="py-2 px-3 border-r border-gray-200 text-center">-</td>
                                        <td className="py-2 px-3">-</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Maklumat / Tata Tertib Singkat Kamar */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-950 space-y-1 mb-4">
                        <strong className="block font-bold uppercase tracking-wider text-amber-900">
                            <i className="bi bi-info-circle-fill mr-1"></i> Tata Tertib Utama Kamar Asrama:
                        </strong>
                        <p className="leading-relaxed">
                            1. Menjaga kebersihan lantai, merapikan kasur &amp; selimut setiap bangun tidur sebelum berangkat sholat Subuh.
                            <br />
                            2. Dilarang memindahkan kasur/lemari tanpa izin Musyrif, dan membuang sampah pada tempat yang ditentukan.
                            <br />
                            3. Jam tenang malam berlaku mulai pukul 22:00 WIB. Lampu utama dimatikan untuk waktu istirahat yang barokah.
                        </p>
                    </div>

                    {/* Tanda Tangan */}
                    <div className="grid grid-cols-2 text-center text-xs mt-6 pt-2">
                        <div>
                            <p className="text-gray-600">Ketua Kamar (Rais Ghorfah),</p>
                            <div className="h-14"></div>
                            <p className="font-bold underline text-gray-900">
                                {ketuaKamar?.namaLengkap || (penghuni.find(s => s.id === kamar.ketuaKamarId)?.namaLengkap) || '( ...................................... )'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">Musyrif / Pembina Asrama,</p>
                            <div className="h-14"></div>
                            <p className="font-bold underline text-gray-900">
                                {musyrif?.nama || '( ...................................... )'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Modal (Hidden in Print) */}
                <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-between items-center print:hidden">
                    <span className="text-xs text-gray-500">
                        Tips: Gunakan opsi cetak Landscape/Portrait A4 di dialog browser untuk hasil terbaik.
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                            <i className="bi bi-printer"></i> Cetak Dokumen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
