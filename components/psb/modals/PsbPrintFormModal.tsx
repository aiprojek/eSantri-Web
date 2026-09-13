import React, { useRef } from 'react';
import { Pendaftar, PondokSettings } from '../../../types';
import { getPsbRegistrationNumber, calculatePsbAverageScore, openWhatsappChat } from '../utils/psbUtils';

interface PsbPrintFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftar: Pendaftar | null;
    settings: PondokSettings;
}

export const PsbPrintFormModal: React.FC<PsbPrintFormModalProps> = ({
    isOpen,
    onClose,
    pendaftar,
    settings
}) => {
    const printAreaRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !pendaftar) return null;

    const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
    const noReg = pendaftar.nomorRegistrasi || getPsbRegistrationNumber(pendaftar, jenjang);
    const avgScore = calculatePsbAverageScore(pendaftar.nilaiUjian);

    const customData = pendaftar.customData ? (() => {
        try { return JSON.parse(pendaftar.customData); } catch { return {}; }
    })() : {};

    const pasFotoUrl = pendaftar.fotoUrl || customData['Pas Foto'] || customData['pas_foto'] || customData['foto'];

    // Helper to format field key into human-readable label
    const formatFieldLabel = (key: string) => {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    // Separate text custom fields from file fields
    const customTextEntries = Object.entries(customData).filter(([key, val]) => {
        if (!val || typeof val !== 'string') return false;
        if (key === 'Timestamp' || key === 'sheetName' || key === 'lastModified') return false;
        // Ignore files/URLs from text section
        if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) return false;
        return true;
    });

    // Uploaded digital documents
    const customFileEntries = Object.entries(customData).filter(([key, val]) => {
        if (!val || typeof val !== 'string') return false;
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:');
    });

    const handlePrint = () => {
        window.print();
    };

    const handleSendWa = () => {
        const phone = pendaftar.nomorHpWali || pendaftar.teleponAyah || pendaftar.teleponIbu;
        const msg = `*BUKTI PENDAFTARAN SANTRI BARU*\n*${settings.namaPonpes || 'PONDOK PESANTREN'}*\n\n` +
            `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n` +
            `Berikut bukti data pendaftaran PSB untuk:\n\n` +
            `• No. Registrasi: *${noReg}*\n` +
            `• Nama Lengkap: *${pendaftar.namaLengkap}*\n` +
            `• Jenjang: *${jenjang}* (${pendaftar.jalurPendaftaran || 'Reguler'})\n` +
            `• Status: *${pendaftar.status}*\n` +
            `• Tanggal Daftar: ${new Date(pendaftar.tanggalDaftar).toLocaleDateString('id-ID')}\n\n` +
            `Lembar formulir fisik telah tercatat di posko penerimaan. Mohon simpan bukti nomor registrasi ini.\n` +
            `Terima kasih.\n_Panitia PSB ${settings.namaPonpes || ''}_`;
        openWhatsappChat(phone, msg);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex justify-center items-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[94vh] overflow-hidden my-auto border border-gray-200">
                {/* Modal Header */}
                <div className="p-4 border-b flex justify-between items-center bg-teal-800 text-white no-print">
                    <div className="flex items-center gap-3">
                        <i className="bi bi-file-earmark-text text-2xl text-teal-200"></i>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">Lembar Formulir Pendaftaran Santri Baru (F-PSB)</h3>
                            <p className="text-xs text-teal-100">Dokumen formulir lengkap siap cetak A4 untuk arsip fisik panitia di lapangan</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700 transition-colors"
                        title="Tutup Modal"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Control Action Bar (No Print) */}
                <div className="p-3 bg-teal-50 border-b border-teal-100 no-print flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-gray-700 flex items-center gap-2">
                        <span className="font-semibold">Pendaftar:</span>
                        <span className="font-bold text-teal-900">{pendaftar.namaLengkap}</span>
                        <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono font-bold text-[11px]">{noReg}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSendWa}
                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                            title="Kirim Bukti Pendaftaran via WA"
                        >
                            <i className="bi bi-whatsapp"></i> Kirim Bukti WA
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                            title="Cetak Formulir ke Kertas A4"
                        >
                            <i className="bi bi-printer-fill"></i> Cetak Formulir (A4)
                        </button>
                    </div>
                </div>

                {/* Printable Document Container */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
                    <div
                        ref={printAreaRef}
                        id="psb-print-form"
                        className="bg-white border border-gray-300 p-8 rounded-xl shadow-md w-full max-w-3xl text-gray-900 print:shadow-none print:border-none print:m-0 print:p-4 text-xs"
                    >
                        {/* 1. Kop Pesantren */}
                        <div className="border-b-2 border-double border-gray-900 pb-3 mb-4 flex items-center gap-4">
                            {(settings.logoPonpesUrl || settings.logoYayasanUrl) ? (
                                <img
                                    src={settings.logoPonpesUrl || settings.logoYayasanUrl}
                                    alt="Logo"
                                    className="w-20 h-20 object-contain rounded-full border border-gray-200 p-0.5"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-teal-800 text-white flex items-center justify-center text-3xl font-black shrink-0">
                                    <i className="bi bi-building"></i>
                                </div>
                            )}
                            <div className="flex-grow text-center">
                                {settings.namaYayasan && (
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                        {settings.namaYayasan}
                                    </h3>
                                )}
                                <h1 className="text-lg font-black tracking-tight text-gray-950 uppercase leading-snug">
                                    {settings.namaPonpes || 'PONDOK PESANTREN'}
                                </h1>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    {settings.alamat || 'Alamat Pesantren'}
                                    {settings.telepon ? ` • Telp/WA: ${settings.telepon}` : ''}
                                    {settings.email ? ` • Email: ${settings.email}` : ''}
                                </p>
                                {(settings.nspp || settings.npsn) && (
                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                        {settings.nspp ? `NSPP: ${settings.nspp}` : ''}
                                        {settings.nspp && settings.npsn ? ' | ' : ''}
                                        {settings.npsn ? `NPSN: ${settings.npsn}` : ''}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 2. Judul Formulir & Identitas Registrasi */}
                        <div className="text-center mb-4">
                            <h2 className="text-sm font-black tracking-wider text-gray-900 uppercase underline decoration-2 underline-offset-4">
                                FORMULIR PENDAFTARAN SANTRI BARU (F-PSB)
                            </h2>
                            <p className="text-[11px] text-gray-600 mt-1 font-medium">
                                Tahun Ajaran / Gelombang: {settings.psbConfig.activeGelombang || '1'}
                            </p>
                        </div>

                        {/* Baris Meta No. Reg & Foto */}
                        <div className="flex items-start justify-between gap-4 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-medium">Nomor Registrasi:</span>
                                    <span className="font-mono font-black text-sm text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-300">
                                        {noReg}
                                    </span>
                                </div>
                                <div className="text-gray-600">
                                    <span className="text-gray-500 font-medium">Tanggal Daftar: </span>
                                    <span className="font-semibold text-gray-800">
                                        {new Date(pendaftar.tanggalDaftar).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="text-gray-600">
                                    <span className="text-gray-500 font-medium">Jenjang & Jalur: </span>
                                    <span className="font-bold text-gray-800">{jenjang}</span>
                                    <span className="text-gray-500"> ({pendaftar.jalurPendaftaran || 'Reguler'})</span>
                                </div>
                                <div className="text-gray-600">
                                    <span className="text-gray-500 font-medium">Status Tahapan: </span>
                                    <span className="font-bold text-teal-800">{pendaftar.status}</span>
                                </div>
                            </div>

                            {/* Foto 3x4 Box */}
                            <div className="w-24 h-32 border-2 border-dashed border-gray-400 rounded-md bg-white flex flex-col items-center justify-center text-center p-1 shrink-0 overflow-hidden">
                                {pasFotoUrl ? (
                                    <img
                                        src={pasFotoUrl}
                                        alt="Pas Foto"
                                        className="w-full h-full object-cover rounded"
                                    />
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center">
                                        <i className="bi bi-person-bounding-box text-2xl mb-1"></i>
                                        <span className="text-[9px] font-bold uppercase leading-tight">Pas Foto<br/>3 x 4 cm</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. BAGIAN I: IDENTITAS CALON SANTRI */}
                        <div className="mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                                I. Data Identitas Calon Santri
                            </h3>
                            <table className="w-full border border-gray-300 divide-y divide-gray-200">
                                <tbody className="divide-y divide-gray-200">
                                    <tr>
                                        <td className="w-44 py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Nama Lengkap</td>
                                        <td className="py-1.5 px-3 font-bold text-gray-950 uppercase">{pendaftar.namaLengkap}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">NISN / NIK</td>
                                        <td className="py-1.5 px-3 font-mono">{pendaftar.nisn || '-'} / {pendaftar.nik || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Tempat, Tanggal Lahir</td>
                                        <td className="py-1.5 px-3">
                                            {pendaftar.tempatLahir || '-'}, {pendaftar.tanggalLahir ? new Date(pendaftar.tanggalLahir).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Jenis Kelamin / WN</td>
                                        <td className="py-1.5 px-3">{pendaftar.jenisKelamin} / {pendaftar.kewarganegaraan || 'WNI'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Anak Ke / Jumlah Saudara</td>
                                        <td className="py-1.5 px-3">
                                            Anak ke-{pendaftar.anakKe || '-'} dari {pendaftar.jumlahSaudara || '-'} bersaudara
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Asal Sekolah / Madrasah</td>
                                        <td className="py-1.5 px-3 font-medium">
                                            {pendaftar.asalSekolah || '-'}
                                            {pendaftar.alamatSekolahAsal ? ` (${pendaftar.alamatSekolahAsal})` : ''}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 4. BAGIAN II: ALAMAT TEMPAT TINGGAL */}
                        <div className="mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                                II. Alamat Domisili Calon Santri
                            </h3>
                            <table className="w-full border border-gray-300 divide-y divide-gray-200">
                                <tbody className="divide-y divide-gray-200">
                                    <tr>
                                        <td className="w-44 py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Jalan / Dusun / RT / RW</td>
                                        <td className="py-1.5 px-3">{pendaftar.alamat?.detail || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Desa / Kelurahan</td>
                                        <td className="py-1.5 px-3">{pendaftar.alamat?.desaKelurahan || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Kecamatan</td>
                                        <td className="py-1.5 px-3">{pendaftar.alamat?.kecamatan || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Kabupaten / Kota & Provinsi</td>
                                        <td className="py-1.5 px-3">
                                            {pendaftar.alamat?.kabupatenKota || '-'}, {pendaftar.alamat?.provinsi || '-'} {pendaftar.alamat?.kodePos ? `(Kode Pos: ${pendaftar.alamat.kodePos})` : ''}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 5. BAGIAN III: DATA ORANG TUA & WALI */}
                        <div className="mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                                III. Data Orang Tua & Wali
                            </h3>
                            <table className="w-full border border-gray-300 text-left">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                                        <th className="py-1.5 px-3 w-40">Keterangan</th>
                                        <th className="py-1.5 px-3 w-1/2">Data Ayah Kandung</th>
                                        <th className="py-1.5 px-3 w-1/2">Data Ibu Kandung</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Nama Lengkap</td>
                                        <td className="py-1.5 px-3 font-bold">{pendaftar.namaAyah || '-'}</td>
                                        <td className="py-1.5 px-3 font-bold">{pendaftar.namaIbu || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">NIK</td>
                                        <td className="py-1.5 px-3 font-mono">{pendaftar.nikAyah || '-'}</td>
                                        <td className="py-1.5 px-3 font-mono">{pendaftar.nikIbu || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Pekerjaan</td>
                                        <td className="py-1.5 px-3">{pendaftar.pekerjaanAyah || '-'}</td>
                                        <td className="py-1.5 px-3">{pendaftar.pekerjaanIbu || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Pendidikan Terakhir</td>
                                        <td className="py-1.5 px-3">{pendaftar.pendidikanAyah || '-'}</td>
                                        <td className="py-1.5 px-3">{pendaftar.pendidikanIbu || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Penghasilan / Bulan</td>
                                        <td className="py-1.5 px-3">{pendaftar.penghasilanAyah || '-'}</td>
                                        <td className="py-1.5 px-3">{pendaftar.penghasilanIbu || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 font-semibold bg-gray-50 text-gray-700">Nomor Telepon / HP</td>
                                        <td className="py-1.5 px-3">{pendaftar.teleponAyah || '-'}</td>
                                        <td className="py-1.5 px-3">{pendaftar.teleponIbu || '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                            {pendaftar.namaWali && (
                                <div className="mt-2 p-2 bg-gray-50 border border-gray-300 rounded text-[11px]">
                                    <span className="font-bold text-gray-800">Wali Santri: </span>
                                    {pendaftar.namaWali} ({pendaftar.statusWali || 'Wali'}) • Telp: {pendaftar.nomorHpWali || '-'} • Pekerjaan: {pendaftar.pekerjaanWali || '-'}
                                </div>
                            )}
                        </div>

                        {/* 5. BAGIAN IV: DATA TAMBAHAN & ISIAN KHUSUS FORMULIR (JIKA ADA) */}
                        {customTextEntries.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                                    IV. Informasi Khusus & Data Tambahan Formulir
                                </h3>
                                <table className="w-full border border-gray-300 text-left">
                                    <tbody className="divide-y divide-gray-200">
                                        {customTextEntries.map(([k, v], idx) => (
                                            <tr key={k} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                                                <td className="py-1.5 px-3 font-semibold text-gray-700 w-1/3 border-r border-gray-200">
                                                    {formatFieldLabel(k)}
                                                </td>
                                                <td className="py-1.5 px-3 text-gray-900 font-medium w-2/3">
                                                    {String(v)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 6. BAGIAN V: VERIFIKASI BERKAS FISIK OLEH PANITIA LAPANGAN */}
                        <div className="mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                                {customTextEntries.length > 0 ? 'V' : 'IV'}. Checklist Verifikasi Berkas Fisik & Lampiran
                            </h3>
                            <table className="w-full border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                                        <th className="py-1 px-3 text-center w-12">No</th>
                                        <th className="py-1 px-3">Jenis Berkas Fisik Persyaratan</th>
                                        <th className="py-1 px-3 text-center w-40">Status Kelengkapan</th>
                                        <th className="py-1 px-3">Paraf & Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {[
                                        { label: 'Fotokopi Kartu Keluarga (KK)', key: 'kk' },
                                        { label: 'Fotokopi Akta Kelahiran', key: 'akta' },
                                        { label: 'Fotokopi Ijazah / SKL Asli', key: 'ijazahSkl' },
                                        { label: 'Surat Keterangan Sehat Dokter', key: 'suratSehat' },
                                        { label: 'Pas Foto 3x4 Resmi (3 Lembar)', key: 'pasFoto' },
                                    ].map((doc, i) => {
                                        const isChecked = pendaftar.berkasFisik ? (pendaftar.berkasFisik as any)[doc.key] : false;
                                        return (
                                            <tr key={doc.key}>
                                                <td className="py-1 px-3 text-center text-gray-500">{i + 1}</td>
                                                <td className="py-1 px-3 font-medium text-gray-800">{doc.label}</td>
                                                <td className="py-1 px-3 text-center font-bold">
                                                    {isChecked ? (
                                                        <span className="text-emerald-700 font-bold">[ ✓ ] Lengkap</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-medium">[   ] Belum</span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-3 text-gray-500 italic text-[11px]">
                                                    {i === 0 && pendaftar.berkasFisik?.catatanBerkas ? pendaftar.berkasFisik.catatanBerkas : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Lampiran berkas digital yang diupload calon santri via formulir */}
                                    {customFileEntries.map(([fileKey, fileVal], fIdx) => (
                                        <tr key={fileKey} className="bg-teal-50/30">
                                            <td className="py-1 px-3 text-center text-teal-800 font-bold">{5 + fIdx + 1}</td>
                                            <td className="py-1 px-3 font-medium text-teal-900">
                                                <span>Berkas Digital: {formatFieldLabel(fileKey)}</span>
                                            </td>
                                            <td className="py-1 px-3 text-center font-semibold text-[11px] text-teal-800">
                                                <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded">[ ✓ ] Terupload</span>
                                            </td>
                                            <td className="py-1 px-3 text-teal-700 text-[10px] truncate max-w-[180px]">
                                                {typeof fileVal === 'string' && fileVal.startsWith('http') ? 'Google Drive Cloud' : 'Tersimpan Offline'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 7. BAGIAN V: CATATAN SELEKSI & UJIAN */}
                        {pendaftar.nilaiUjian && (
                            <div className="mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                                    V. Hasil Ujian Masuk & Seleksi (Panitia Penguji)
                                </h3>
                                <div className="border border-gray-300 p-2.5 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <span className="text-gray-600 font-medium">Tes Qur'an: </span>
                                        <span className="font-bold">{pendaftar.nilaiUjian.bacaQuran || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 font-medium">Tahfidz: </span>
                                        <span className="font-bold">{pendaftar.nilaiUjian.tahfizh || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 font-medium">Akademik: </span>
                                        <span className="font-bold">{pendaftar.nilaiUjian.akademik || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 font-medium">Wawancara: </span>
                                        <span className="font-bold">{pendaftar.nilaiUjian.wawancara || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 font-medium">Rata-rata: </span>
                                        <span className="font-black text-indigo-900 text-sm">{avgScore || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 font-medium">Rekomendasi: </span>
                                        <span className="font-bold text-teal-800">{pendaftar.nilaiUjian.rekomendasi || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 8. BAGIAN VI: LEMBAR TANDA TANGAN & PENGESAHAN LAPANGAN */}
                        <div className="mt-6 pt-3 border-t border-gray-300">
                            <div className="text-right text-gray-700 mb-4">
                                {settings.alamat?.split(',')[0] || 'Posko Panitia'}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="font-semibold text-gray-700 mb-14">Calon Santri,</p>
                                    <p className="font-bold text-gray-900 underline uppercase">{pendaftar.namaLengkap}</p>
                                    <p className="text-[10px] text-gray-500">Tanda Tangan & Nama</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-14">Orang Tua / Wali Santri,</p>
                                    <p className="font-bold text-gray-900 underline uppercase">{pendaftar.namaWali || pendaftar.namaAyah || 'Orang Tua'}</p>
                                    <p className="text-[10px] text-gray-500">Tanda Tangan & Nama</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-14">Panitia Penerimaan PSB,</p>
                                    <p className="font-bold text-gray-900 underline uppercase">( ............................................ )</p>
                                    <p className="text-[10px] text-gray-500">Nama & Cap Posko Lapangan</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Print Info */}
                        <div className="mt-8 pt-2 border-t border-dashed border-gray-300 text-[10px] text-gray-500 flex justify-between">
                            <span>Dicetak dari Sistem Administrasi eSantri Web • Tanggal Cetak: {new Date().toLocaleString('id-ID')}</span>
                            <span>Dokumen Resmi Panitia PSB</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
