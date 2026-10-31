import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pendaftar, PondokSettings } from '../../../types';
import {
    getPsbRegistrationNumber,
    calculatePsbAverageScore,
    openWhatsappChat,
    healPendaftarRecord,
    getPendaftarPhone,
    resolveCustomFieldLabel
} from '../utils/psbUtils';
import { printToPdfNative } from '../../../utils/pdfGenerator';
import { useAppContext } from '../../../AppContext';

type PsbPrintScaleMode = 'fit_1_page' | 'auto' | '95' | '90' | '85' | '80' | '75';

interface PsbPrintFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftar?: Pendaftar | null;
    pendaftarList?: Pendaftar[];
    settings: PondokSettings;
}

interface PsbApplicantSheetProps {
    pendaftar: Pendaftar;
    settings: PondokSettings;
    paperSize: 'A4' | 'F4';
    scaleMode: PsbPrintScaleMode;
    isLastItem: boolean;
}

const PsbApplicantFormContent: React.FC<{
    pendaftar: Pendaftar;
    settings: PondokSettings;
}> = ({ pendaftar, settings }) => {
    const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
    const noReg = pendaftar.nomorRegistrasi || getPsbRegistrationNumber(pendaftar, jenjang);
    const avgScore = calculatePsbAverageScore(pendaftar.nilaiUjian);

    const customData = pendaftar.customData
        ? (() => {
              try {
                  return JSON.parse(pendaftar.customData);
              } catch {
                  return {};
              }
          })()
        : {};

    const pasFotoUrl =
        pendaftar.fotoUrl || customData['Pas Foto'] || customData['pas_foto'] || customData['foto'];

    const matchingTemplate = (settings.psbConfig?.templates || []).find(
        t =>
            t.targetJenjangId === pendaftar.jenjangId &&
            Array.isArray(t.customFields) &&
            t.customFields.length > 0
    );
    const activeCustomFields = (
        matchingTemplate?.customFields && matchingTemplate.customFields.length > 0
            ? matchingTemplate.customFields
            : settings.psbConfig?.customFields || []
    ).filter(f => f && f.type !== 'section' && f.type !== 'statement');

    const isFileValue = (val: any): boolean => {
        if (typeof val !== 'string') return false;
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:');
    };

    const customDisplayEntries: Array<{
        key: string;
        label: string;
        value: string;
        isFile: boolean;
        hasFile?: boolean;
    }> = [];
    const seenLabels = new Set<string>();

    Object.entries(customData).forEach(([rawKey, rawVal]) => {
        if (rawVal === undefined || rawVal === null || rawVal === '') return;
        if (['Timestamp', 'sheetName', 'lastModified', 'driveFolderId', 'folderId'].includes(rawKey)) return;
        const strVal = Array.isArray(rawVal) ? rawVal.filter(Boolean).join(', ') : String(rawVal);
        if (!strVal.trim()) return;

        const resolvedLabel = resolveCustomFieldLabel(rawKey, settings, pendaftar.jenjangId, strVal);
        const normLbl = resolvedLabel.toLowerCase();
        if (seenLabels.has(normLbl)) return;
        seenLabels.add(normLbl);

        if (isFileValue(strVal)) {
            customDisplayEntries.push({
                key: rawKey,
                label: resolvedLabel,
                value: strVal.startsWith('http')
                    ? '[ ✓ ] Terlampir (Dokumen Digital Cloud)'
                    : '[ ✓ ] Terlampir (Dokumen Digital)',
                isFile: true,
                hasFile: true
            });
        } else {
            customDisplayEntries.push({
                key: rawKey,
                label: resolvedLabel,
                value: strVal,
                isFile: false
            });
        }
    });

    activeCustomFields.forEach(cf => {
        const lbl = (cf.label || '').trim();
        if (!lbl) return;
        const normLbl = lbl.toLowerCase();
        if (seenLabels.has(normLbl)) return;
        seenLabels.add(normLbl);

        if (cf.type === 'file') {
            customDisplayEntries.push({
                key: cf.id,
                label: lbl,
                value: '[   ] Belum Dilampirkan / Bawa Fisik',
                isFile: true,
                hasFile: false
            });
        } else {
            customDisplayEntries.push({
                key: cf.id,
                label: lbl,
                value: '-',
                isFile: false
            });
        }
    });

    const customFileChecklistEntries = customDisplayEntries.filter(item => item.isFile);

    const alamatDetail = (pendaftar as any).alamatRumah || (pendaftar as any).alamat?.detail || '-';
    const desaKelurahan = (pendaftar as any).desaKelurahan || (pendaftar as any).alamat?.desaKelurahan || '-';
    const kecamatan = (pendaftar as any).kecamatan || (pendaftar as any).alamat?.kecamatan || '-';
    const kabupatenKota = (pendaftar as any).kabupatenKota || (pendaftar as any).alamat?.kabupatenKota || '-';
    const provinsi = (pendaftar as any).provinsi || (pendaftar as any).alamat?.provinsi || '-';
    const kodePos = (pendaftar as any).kodePos || (pendaftar as any).alamat?.kodePos || '';
    const asalSekolah = (pendaftar as any).sekolahAsal || (pendaftar as any).asalSekolah || '-';

    return (
        <div className="text-slate-950 text-xs leading-snug">
            {/* 1. Kop Pesantren */}
            <div className="border-b-2 border-double border-slate-900 pb-3 mb-3.5 flex items-center gap-4">
                {settings.logoPonpesUrl || settings.logoYayasanUrl ? (
                    <img
                        src={settings.logoPonpesUrl || settings.logoYayasanUrl}
                        alt="Logo"
                        width={64}
                        height={64}
                        className="psb-kop-logo w-16 h-16 object-contain shrink-0"
                        style={{
                            width: '64px',
                            height: '64px',
                            maxWidth: '64px',
                            maxHeight: '64px',
                            objectFit: 'contain'
                        }}
                    />
                ) : (
                    <div
                        className="psb-kop-logo w-16 h-16 rounded-full bg-teal-800 text-white flex items-center justify-center text-2xl font-black shrink-0"
                        style={{ width: '64px', height: '64px' }}
                    >
                        <i className="bi bi-building"></i>
                    </div>
                )}
                <div className="flex-grow text-center">
                    {settings.namaYayasan && (
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {settings.namaYayasan}
                        </h3>
                    )}
                    <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-snug">
                        {settings.namaPonpes || 'PONDOK PESANTREN'}
                    </h1>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                        {settings.alamat || 'Alamat Pesantren'}
                        {settings.telepon ? ` • Telp/WA: ${settings.telepon}` : ''}
                        {settings.email ? ` • Email: ${settings.email}` : ''}
                    </p>
                    {(settings.nspp || settings.npsn) && (
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                            {settings.nspp ? `NSPP: ${settings.nspp}` : ''}
                            {settings.nspp && settings.npsn ? ' | ' : ''}
                            {settings.npsn ? `NPSN: ${settings.npsn}` : ''}
                        </p>
                    )}
                </div>
            </div>

            {/* 2. Judul Formulir & Identitas Registrasi */}
            <div className="text-center mb-3.5">
                <h2 className="text-sm font-black tracking-wider text-slate-950 uppercase underline decoration-2 underline-offset-4">
                    FORMULIR PENDAFTARAN SANTRI BARU (F-PSB)
                </h2>
                <p className="text-[11px] text-slate-700 mt-1 font-semibold">
                    Tahun Ajaran {settings.psbConfig?.tahunAjaranAktif || new Date().getFullYear()} • Gelombang{' '}
                    {pendaftar.gelombang || settings.psbConfig?.activeGelombang || '1'}
                </p>
            </div>

            {/* Baris Meta No. Reg & Foto */}
            <div className="flex items-start justify-between gap-4 mb-3.5 bg-slate-50 p-3 rounded-lg border border-slate-400">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-semibold">Nomor Registrasi:</span>
                        <span className="font-mono font-black text-sm text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-600">
                            {noReg}
                        </span>
                    </div>
                    <div className="text-slate-800">
                        <span className="text-slate-600 font-medium">Tanggal Daftar: </span>
                        <span className="font-semibold text-slate-950">
                            {new Date(pendaftar.tanggalDaftar).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                    </div>
                    <div className="text-slate-800">
                        <span className="text-slate-600 font-medium">Jenjang &amp; Jalur: </span>
                        <span className="font-bold text-slate-950">{jenjang}</span>
                        <span className="text-slate-700"> ({pendaftar.jalurPendaftaran || 'Reguler'})</span>
                    </div>
                    <div className="text-slate-800">
                        <span className="text-slate-600 font-medium">Status Tahapan: </span>
                        <span className="font-bold text-teal-900">{pendaftar.status}</span>
                    </div>
                </div>

                {/* Foto 3x4 Box */}
                <div
                    className="psb-pasfoto-box w-24 h-32 border border-dashed border-slate-600 rounded bg-white flex flex-col items-center justify-center text-center p-1 shrink-0 overflow-hidden"
                    style={{
                        width: '90px',
                        height: '120px',
                        minWidth: '90px',
                        maxWidth: '90px',
                        maxHeight: '120px'
                    }}
                >
                    {pasFotoUrl ? (
                        <img
                            src={pasFotoUrl}
                            alt="Pas Foto"
                            width={82}
                            height={112}
                            className="w-full h-full object-cover rounded-sm"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div className="text-slate-500 flex flex-col items-center">
                            <i className="bi bi-person-bounding-box text-2xl mb-1"></i>
                            <span className="text-[9px] font-bold uppercase leading-tight">
                                Pas Foto
                                <br />3 x 4 cm
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. BAGIAN I: IDENTITAS CALON SANTRI */}
            <div className="mb-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                    I. Data Identitas Calon Santri
                </h3>
                <table className="w-full border border-slate-400 border-collapse">
                    <tbody>
                        <tr className="border-b border-slate-300">
                            <td className="w-44 py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Nama Lengkap
                            </td>
                            <td className="py-1 px-3 font-bold text-slate-950 uppercase">{pendaftar.namaLengkap}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                NISN / NIK
                            </td>
                            <td className="py-1 px-3 font-mono text-slate-900">
                                {pendaftar.nisn || '-'} / {pendaftar.nik || '-'}
                            </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Tempat, Tanggal Lahir
                            </td>
                            <td className="py-1 px-3 text-slate-900">
                                {pendaftar.tempatLahir || '-'},{' '}
                                {pendaftar.tanggalLahir
                                    ? new Date(pendaftar.tanggalLahir).toLocaleDateString('id-ID')
                                    : '-'}
                            </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Jenis Kelamin / WN
                            </td>
                            <td className="py-1 px-3 text-slate-900">
                                {pendaftar.jenisKelamin} / {pendaftar.kewarganegaraan || 'WNI'}
                            </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Anak Ke / Jumlah Saudara
                            </td>
                            <td className="py-1 px-3 text-slate-900">
                                Anak ke-{pendaftar.anakKe || '-'} dari {pendaftar.jumlahSaudara || '-'} bersaudara
                            </td>
                        </tr>
                        <tr className="border-b border-slate-300 last:border-b-0">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Asal Sekolah / Madrasah
                            </td>
                            <td className="py-1 px-3 font-medium text-slate-900">
                                {asalSekolah}
                                {pendaftar.alamatSekolahAsal ? ` (${pendaftar.alamatSekolahAsal})` : ''}
                            </td>
                        </tr>
                        {(pendaftar.tinggiBadan ||
                            pendaftar.beratBadan ||
                            pendaftar.golonganDarah ||
                            pendaftar.riwayatPenyakit) && (
                            <tr className="border-t border-slate-300">
                                <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                    Fisik &amp; Kesehatan
                                </td>
                                <td className="py-1 px-3 text-slate-900">
                                    TB: {pendaftar.tinggiBadan ? `${pendaftar.tinggiBadan} cm` : '-'} • BB:{' '}
                                    {pendaftar.beratBadan ? `${pendaftar.beratBadan} kg` : '-'} • Gol. Darah:{' '}
                                    {pendaftar.golonganDarah || '-'}
                                    {pendaftar.riwayatPenyakit ? ` • Riwayat Penyakit: ${pendaftar.riwayatPenyakit}` : ''}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 4. BAGIAN II: ALAMAT TEMPAT TINGGAL */}
            <div className="mb-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                    II. Alamat Domisili Calon Santri
                </h3>
                <table className="w-full border border-slate-400 border-collapse">
                    <tbody>
                        <tr className="border-b border-slate-300">
                            <td className="w-44 py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Jalan / Dusun / RT / RW
                            </td>
                            <td className="py-1 px-3 text-slate-900">{alamatDetail}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Desa / Kelurahan
                            </td>
                            <td className="py-1 px-3 text-slate-900">{desaKelurahan}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Kecamatan
                            </td>
                            <td className="py-1 px-3 text-slate-900">{kecamatan}</td>
                        </tr>
                        <tr>
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Kabupaten / Kota &amp; Provinsi
                            </td>
                            <td className="py-1 px-3 text-slate-900">
                                {kabupatenKota}, {provinsi} {kodePos ? `(Kode Pos: ${kodePos})` : ''}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 5. BAGIAN III: DATA ORANG TUA & WALI */}
            <div className="mb-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                    III. Data Orang Tua &amp; Wali
                </h3>
                <table className="w-full border border-slate-400 border-collapse text-left">
                    <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                            <th className="py-1 px-3 w-40 border-r border-slate-300">Keterangan</th>
                            <th className="py-1 px-3 w-1/2 border-r border-slate-300">Data Ayah Kandung</th>
                            <th className="py-1 px-3 w-1/2">Data Ibu Kandung</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Nama Lengkap
                            </td>
                            <td className="py-1 px-3 font-bold text-slate-950 border-r border-slate-300">
                                {pendaftar.namaAyah || '-'}
                            </td>
                            <td className="py-1 px-3 font-bold text-slate-950">{pendaftar.namaIbu || '-'}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                NIK
                            </td>
                            <td className="py-1 px-3 font-mono text-slate-900 border-r border-slate-300">
                                {pendaftar.nikAyah || '-'}
                            </td>
                            <td className="py-1 px-3 font-mono text-slate-900">{pendaftar.nikIbu || '-'}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Pekerjaan
                            </td>
                            <td className="py-1 px-3 text-slate-900 border-r border-slate-300">
                                {pendaftar.pekerjaanAyah || '-'}
                            </td>
                            <td className="py-1 px-3 text-slate-900">{pendaftar.pekerjaanIbu || '-'}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Pendidikan Terakhir
                            </td>
                            <td className="py-1 px-3 text-slate-900 border-r border-slate-300">
                                {pendaftar.pendidikanAyah || '-'}
                            </td>
                            <td className="py-1 px-3 text-slate-900">{pendaftar.pendidikanIbu || '-'}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Penghasilan / Bulan
                            </td>
                            <td className="py-1 px-3 text-slate-900 border-r border-slate-300">
                                {pendaftar.penghasilanAyah || '-'}
                            </td>
                            <td className="py-1 px-3 text-slate-900">{pendaftar.penghasilanIbu || '-'}</td>
                        </tr>
                        <tr>
                            <td className="py-1 px-3 font-semibold bg-slate-50 text-slate-800 border-r border-slate-300">
                                Nomor Telepon / HP
                            </td>
                            <td className="py-1 px-3 text-slate-900 border-r border-slate-300">
                                {pendaftar.teleponAyah || '-'}
                            </td>
                            <td className="py-1 px-3 text-slate-900">{pendaftar.teleponIbu || '-'}</td>
                        </tr>
                    </tbody>
                </table>
                {pendaftar.namaWali && (
                    <div className="mt-1.5 p-2 bg-slate-50 border border-slate-400 rounded text-[11px] text-slate-900">
                        <span className="font-bold text-slate-950">Wali Santri: </span>
                        {pendaftar.namaWali} ({pendaftar.statusWali || 'Wali'})
                        {pendaftar.nikWali ? ` • NIK: ${pendaftar.nikWali}` : ''}
                        {' • '}Telp: {pendaftar.nomorHpWali || '-'}
                        {' • '}Pendidikan: {pendaftar.pendidikanWali || '-'}
                        {' • '}Pekerjaan: {pendaftar.pekerjaanWali || '-'}
                        {' • '}Penghasilan: {pendaftar.penghasilanWali || '-'}
                    </div>
                )}
            </div>

            {/* 6. BAGIAN IV: DATA TAMBAHAN & ISIAN KHUSUS FORMULIR */}
            {customDisplayEntries.length > 0 && (
                <div className="mb-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                        IV. Informasi Khusus, Pertanyaan Tambahan &amp; Lampiran Formulir
                    </h3>
                    <table className="w-full border border-slate-400 border-collapse text-left">
                        <tbody>
                            {customDisplayEntries.map((entry, idx) => (
                                <tr
                                    key={entry.key}
                                    className={`border-b border-slate-300 last:border-b-0 ${
                                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                    }`}
                                >
                                    <td className="py-1 px-3 font-semibold text-slate-800 w-2/5 border-r border-slate-300">
                                        {entry.label}
                                    </td>
                                    <td
                                        className={`py-1 px-3 font-medium w-3/5 ${
                                            entry.isFile
                                                ? entry.hasFile
                                                    ? 'text-teal-900 font-bold'
                                                    : 'text-slate-600 italic'
                                                : 'text-slate-950'
                                        }`}
                                    >
                                        {entry.value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 7. BAGIAN V: VERIFIKASI BERKAS FISIK OLEH PANITIA LAPANGAN */}
            <div className="mb-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                    {customDisplayEntries.length > 0 ? 'V' : 'IV'}. Checklist Verifikasi Berkas Fisik &amp; Lampiran
                </h3>
                <table className="w-full border border-slate-400 border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                            <th className="py-1 px-3 text-center w-12 border-r border-slate-300">No</th>
                            <th className="py-1 px-3 text-left border-r border-slate-300">
                                Jenis Berkas Persyaratan / Pertanyaan Dokumen
                            </th>
                            <th className="py-1 px-3 text-center w-40 border-r border-slate-300">Status Kelengkapan</th>
                            <th className="py-1 px-3 text-left">Paraf &amp; Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { label: 'Fotokopi Kartu Keluarga (KK)', key: 'kk' },
                            { label: 'Fotokopi Akta Kelahiran', key: 'akta' },
                            { label: 'Fotokopi Ijazah / SKL Asli', key: 'ijazahSkl' },
                            { label: 'Surat Keterangan Sehat Dokter', key: 'suratSehat' },
                            { label: 'Pas Foto 3x4 Resmi (3 Lembar)', key: 'pasFoto' }
                        ].map((doc, i) => {
                            const isChecked = pendaftar.berkasFisik ? (pendaftar.berkasFisik as any)[doc.key] : false;
                            return (
                                <tr key={doc.key} className="border-b border-slate-300 last:border-b-0">
                                    <td className="py-1 px-3 text-center text-slate-700 border-r border-slate-300">
                                        {i + 1}
                                    </td>
                                    <td className="py-1 px-3 font-medium text-slate-900 border-r border-slate-300">
                                        {doc.label}
                                    </td>
                                    <td className="py-1 px-3 text-center font-bold border-r border-slate-300">
                                        {isChecked ? (
                                            <span className="text-emerald-800 font-bold">[ ✓ ] Lengkap</span>
                                        ) : (
                                            <span className="text-slate-500 font-medium">[   ] Belum</span>
                                        )}
                                    </td>
                                    <td className="py-1 px-3 text-slate-600 italic text-[11px]">
                                        {i === 0 && pendaftar.berkasFisik?.catatanBerkas
                                            ? pendaftar.berkasFisik.catatanBerkas
                                            : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                        {customFileChecklistEntries.map((fileItem, fIdx) => (
                            <tr
                                key={fileItem.key}
                                className="bg-teal-50 border-t border-slate-300"
                            >
                                <td className="py-1 px-3 text-center text-teal-900 font-bold border-r border-slate-300">
                                    {5 + fIdx + 1}
                                </td>
                                <td className="py-1 px-3 font-medium text-teal-950 border-r border-slate-300">
                                    <span>Berkas: {fileItem.label}</span>
                                </td>
                                <td className="py-1 px-3 text-center font-semibold text-[11px] text-teal-900 border-r border-slate-300">
                                    {fileItem.hasFile ? (
                                        <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-bold">
                                            [ ✓ ] Terupload
                                        </span>
                                    ) : (
                                        <span className="text-slate-500 font-medium">[   ] Belum</span>
                                    )}
                                </td>
                                <td className="py-1 px-3 text-teal-800 text-[10px] truncate max-w-[180px]">
                                    {fileItem.hasFile
                                        ? fileItem.value.includes('Cloud')
                                            ? 'Google Drive Cloud'
                                            : 'Tersimpan Digital'
                                        : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 8. BAGIAN VI: CATATAN SELEKSI & UJIAN */}
            {pendaftar.nilaiUjian && (
                <div className="mb-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider bg-teal-900 text-white px-2.5 py-1 rounded-t mb-0">
                        {customDisplayEntries.length > 0 ? 'VI' : 'V'}. Hasil Ujian Masuk &amp; Seleksi (Panitia Penguji)
                    </h3>
                    <div className="border border-slate-400 p-2.5 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <span className="text-slate-600 font-medium">Tes Qur&apos;an: </span>
                            <span className="font-bold text-slate-950">{pendaftar.nilaiUjian.bacaQuran || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-600 font-medium">Tahfidz: </span>
                            <span className="font-bold text-slate-950">{pendaftar.nilaiUjian.tahfizh || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-600 font-medium">Akademik: </span>
                            <span className="font-bold text-slate-950">{pendaftar.nilaiUjian.akademik || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-600 font-medium">Wawancara: </span>
                            <span className="font-bold text-slate-950">{pendaftar.nilaiUjian.wawancara || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-600 font-medium">Rata-rata: </span>
                            <span className="font-black text-indigo-900 text-sm">{avgScore || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-600 font-medium">Rekomendasi: </span>
                            <span className="font-bold text-teal-900">{pendaftar.nilaiUjian.rekomendasi || '-'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 9. LEMBAR TANDA TANGAN & PENGESAHAN LAPANGAN */}
            <div className="mt-4 pt-2.5 border-t border-slate-400">
                <div className="text-right text-slate-800 mb-3">
                    {settings.alamat?.split(',')[0] || 'Posko Panitia'},{' '}
                    {new Date().toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="font-semibold text-slate-800 mb-12">Calon Santri,</p>
                        <p className="font-bold text-slate-950 underline uppercase">{pendaftar.namaLengkap}</p>
                        <p className="text-[10px] text-slate-600">Tanda Tangan &amp; Nama</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 mb-12">Orang Tua / Wali Santri,</p>
                        <p className="font-bold text-slate-950 underline uppercase">
                            {pendaftar.namaWali || pendaftar.namaAyah || 'Orang Tua'}
                        </p>
                        <p className="text-[10px] text-slate-600">Tanda Tangan &amp; Nama</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 mb-12">Panitia Penerimaan PSB,</p>
                        <p className="font-bold text-slate-950 underline uppercase">
                            ( ............................................ )
                        </p>
                        <p className="text-[10px] text-slate-600">Nama &amp; Cap Posko Lapangan</p>
                    </div>
                </div>
            </div>

            {/* Footer Print Info */}
            <div className="mt-5 pt-2 border-t border-dashed border-slate-400 text-[10px] text-slate-600 flex justify-between">
                <span>
                    Dicetak dari Sistem Administrasi eSantri Web • Tanggal Cetak: {new Date().toLocaleString('id-ID')}
                </span>
                <span>Dokumen Resmi Panitia PSB</span>
            </div>
        </div>
    );
};

const PsbApplicantVectorSheet: React.FC<PsbApplicantSheetProps> = ({
    pendaftar,
    settings,
    paperSize,
    scaleMode,
    isLastItem
}) => {
    const measureRef = useRef<HTMLDivElement>(null);
    const [naturalHeight, setNaturalHeight] = useState<number>(0);

    // Exact printable geometry (matching Rapor vector architecture at 96 CSS px/inch)
    // A4 = 21cm × 29.7cm (safe 29.65cm), padding 0.8cm top/bottom & 1.0cm left/right => inner width 19cm (718px), inner height 28.05cm (~1055px)
    // F4 = 21.5cm × 33.0cm (safe 32.95cm), padding 0.8cm top/bottom & 1.0cm left/right => inner width 19.5cm (737px), inner height 31.35cm (~1180px)
    const innerWidthPx = paperSize === 'F4' ? 737 : 718;
    const availableHeightPx = paperSize === 'F4' ? 1172 : 1048;
    const pageWidthCm = paperSize === 'F4' ? 21.5 : 21;
    const safePageHeightCm = paperSize === 'F4' ? 32.95 : 29.65;

    useLayoutEffect(() => {
        if (scaleMode !== 'fit_1_page') return;
        const el = measureRef.current;
        if (!el) return;

        const updateHeight = () => {
            const h = el.scrollHeight || el.offsetHeight;
            if (h > 0) setNaturalHeight(h);
        };

        updateHeight();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
        if (ro) ro.observe(el);

        return () => {
            if (ro) ro.disconnect();
        };
    }, [scaleMode, paperSize, pendaftar, settings]);

    const fitScale = useMemo(() => {
        if (scaleMode !== 'fit_1_page' || naturalHeight <= 0) return 1;
        return Math.min(1, Math.max(0.35, Number(((availableHeightPx / naturalHeight) * 0.99).toFixed(4))));
    }, [scaleMode, naturalHeight, availableHeightPx]);

    const manualScaleFactor = useMemo(() => {
        if (['95', '90', '85', '80', '75'].includes(scaleMode)) {
            return Number(scaleMode) / 100;
        }
        return 1;
    }, [scaleMode]);

    if (scaleMode === 'fit_1_page') {
        const isScaled = fitScale < 0.999;
        return (
            <div className="relative">
                {/* Offscreen unscaled measurement clone — stripped automatically by printToPdfNative */}
                <div
                    ref={measureRef}
                    data-rapor-measure-only="true"
                    aria-hidden="true"
                    style={{
                        position: 'fixed',
                        left: '-9999px',
                        top: 0,
                        width: `${innerWidthPx}px`,
                        visibility: 'hidden',
                        pointerEvents: 'none',
                        zIndex: -1
                    }}
                >
                    <PsbApplicantFormContent pendaftar={pendaftar} settings={settings} />
                </div>

                {/* Exact physical vector page box (same vector mechanism as Rapor) */}
                <div
                    data-print-orientation="portrait"
                    className={`psb-exact-page bg-white border border-slate-300 rounded-xl shadow-md mx-auto box-border ${
                        !isLastItem ? 'page-break-after' : ''
                    }`}
                    style={{
                        width: `${pageWidthCm}cm`,
                        height: `${safePageHeightCm}cm`,
                        maxHeight: `${safePageHeightCm}cm`,
                        padding: '0.8cm 1cm',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div
                        className="psb-scaled-viewport"
                        style={{
                            width: `${Math.round(innerWidthPx * fitScale)}px`,
                            height: '100%',
                            margin: '0 auto',
                            position: 'relative'
                        }}
                    >
                        <div
                            className="psb-print-form-sheet psb-exact-page-inner"
                            style={{
                                width: `${innerWidthPx}px`,
                                position: isScaled ? 'absolute' : 'relative',
                                top: isScaled ? 0 : undefined,
                                left: isScaled ? 0 : undefined,
                                transform: isScaled ? `scale(${fitScale})` : undefined,
                                transformOrigin: 'top left'
                            }}
                        >
                            <PsbApplicantFormContent pendaftar={pendaftar} settings={settings} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="psb-print-form-sheet bg-white border border-slate-300 p-6 sm:p-8 rounded-xl shadow-md w-full max-w-[21cm] h-fit mx-auto text-slate-950"
            style={manualScaleFactor < 1 ? ({ zoom: manualScaleFactor } as React.CSSProperties) : undefined}
        >
            <PsbApplicantFormContent pendaftar={pendaftar} settings={settings} />
        </div>
    );
};

export const PsbPrintFormModal: React.FC<PsbPrintFormModalProps> = ({
    isOpen,
    onClose,
    pendaftar: rawPendaftar,
    pendaftarList: rawPendaftarList,
    settings
}) => {
    const { showToast } = useAppContext();
    const printAreaRef = useRef<HTMLDivElement>(null);
    const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
    const [scaleMode, setScaleMode] = useState<PsbPrintScaleMode>('fit_1_page');

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-print-open');
            return () => {
                document.body.classList.remove('modal-print-open');
            };
        }
    }, [isOpen]);

    const items = useMemo(() => {
        const list =
            rawPendaftarList && rawPendaftarList.length > 0
                ? rawPendaftarList
                : rawPendaftar
                ? [rawPendaftar]
                : [];
        return list.map(p => healPendaftarRecord(p, settings));
    }, [rawPendaftar, rawPendaftarList, settings]);

    if (!isOpen || items.length === 0) return null;

    const isBulk = items.length > 1;
    const firstPendaftar = items[0];
    const firstJenjang = settings.jenjang.find(j => j.id === firstPendaftar.jenjangId)?.nama || '-';
    const firstNoReg = firstPendaftar.nomorRegistrasi || getPsbRegistrationNumber(firstPendaftar, firstJenjang);

    const handlePrint = () => {
        const printOptions = {
            paperSize,
            orientation: 'portrait' as const,
            margin:
                scaleMode === 'fit_1_page'
                    ? undefined
                    : { top: 0.8, right: 1, bottom: 0.8, left: 1 }
        };

        if (isBulk) {
            printToPdfNative(
                'psb-print-form',
                `Formulir_PSB_Massal_${items.length}_Pendaftar_${new Date().toISOString().slice(0, 10)}`,
                printOptions
            );
        } else {
            const cleanName = (firstPendaftar.namaLengkap || 'Santri').replace(/[^a-zA-Z0-9_-]/g, '_');
            printToPdfNative('psb-print-form', `Formulir_PSB_${firstNoReg}_${cleanName}`, printOptions);
        }
    };

    const handleSendWa = (pendaftar: Pendaftar) => {
        const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
        const noReg = pendaftar.nomorRegistrasi || getPsbRegistrationNumber(pendaftar, jenjang);
        const phone = getPendaftarPhone(pendaftar);
        const msg =
            `*BUKTI PENDAFTARAN SANTRI BARU*\n*${settings.namaPonpes || 'PONDOK PESANTREN'}*\n\n` +
            `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n` +
            `Berikut bukti data pendaftaran PSB untuk:\n\n` +
            `• No. Registrasi: *${noReg}*\n` +
            `• Nama Lengkap: *${pendaftar.namaLengkap}*\n` +
            `• Jenjang: *${jenjang}* (${pendaftar.jalurPendaftaran || 'Reguler'})\n` +
            `• Status: *${pendaftar.status}*\n` +
            `• Tanggal Daftar: ${new Date(pendaftar.tanggalDaftar).toLocaleDateString('id-ID')}\n\n` +
            `Lembar formulir fisik telah tercatat di posko penerimaan. Mohon simpan bukti nomor registrasi ini.\n` +
            `Terima kasih.\n_Panitia PSB ${settings.namaPonpes || ''}_`;
        const ok = openWhatsappChat(phone, msg);
        if (!ok) {
            showToast(
                'Nomor telepon/WhatsApp wali belum diisi atau tidak valid. Silakan lengkapi di Edit Pendaftar.',
                'error'
            );
        }
    };

    return createPortal(
        <div className="print-modal-target fixed inset-0 bg-black/60 z-[80] flex justify-center items-center p-2 sm:p-4 overflow-y-auto">
            <div className="print-modal-card bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[94vh] overflow-hidden my-auto border border-gray-200">
                {/* Modal Header */}
                <div className="p-4 border-b flex justify-between items-center bg-teal-800 text-white no-print">
                    <div className="flex items-center gap-3">
                        <i className="bi bi-file-earmark-text text-2xl text-teal-200"></i>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">
                                {isBulk
                                    ? `Cetak Massal Formulir Pendaftaran (F-PSB) — ${items.length} Pendaftar`
                                    : 'Lembar Formulir Pendaftaran Santri Baru (F-PSB)'}
                            </h3>
                            <p className="text-xs text-teal-100">
                                {isBulk
                                    ? `Setiap formulir pendaftar otomatis terpisah per halaman ${paperSize} vektor tajam saat dicetak`
                                    : `Dokumen formulir vektor tajam siap cetak ${paperSize} untuk arsip fisik panitia di lapangan`}
                            </p>
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
                    {isBulk ? (
                        <div className="text-gray-700 flex items-center gap-2">
                            <span className="bg-teal-700 text-white px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                                {items.length} Pendaftar Terpilih
                            </span>
                            <span className="text-gray-600 hidden md:inline">
                                Gulir ke bawah untuk meninjau pratinjau tiap lembar formulir sebelum mencetak.
                            </span>
                        </div>
                    ) : (
                        <div className="text-gray-700 flex items-center gap-2">
                            <span className="font-semibold">Pendaftar:</span>
                            <span className="font-bold text-teal-900">{firstPendaftar.namaLengkap}</span>
                            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                                {firstNoReg}
                            </span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Ukuran Kertas & Skala Vektor (seperti Rapor) */}
                        <div className="flex items-center gap-1.5 bg-white border border-teal-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                            <i className="bi bi-file-earmark-medical text-teal-700"></i>
                            <select
                                value={paperSize}
                                onChange={e => setPaperSize(e.target.value as 'A4' | 'F4')}
                                className="font-bold text-xs text-slate-800 bg-transparent outline-none cursor-pointer"
                                title="Ukuran Kertas Cetak"
                            >
                                <option value="A4">Kertas A4</option>
                                <option value="F4">Kertas F4</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <i className="bi bi-aspect-ratio text-indigo-600"></i>
                            <select
                                value={scaleMode}
                                onChange={e => setScaleMode(e.target.value as PsbPrintScaleMode)}
                                className="font-bold text-xs text-indigo-950 bg-transparent outline-none cursor-pointer"
                                title="Mode Penyesuaian Skala Cetak Vektor (Tetap tajam seperti Rapor)"
                            >
                                <option value="fit_1_page">Fit 1 Halaman</option>
                                <option value="auto">100% (Otomatis / Oper Hal.)</option>
                                <option value="95">Skala Manual 95%</option>
                                <option value="90">Skala Manual 90%</option>
                                <option value="85">Skala Manual 85%</option>
                                <option value="80">Skala Manual 80%</option>
                                <option value="75">Skala Manual 75%</option>
                            </select>
                        </div>

                        {!isBulk && (
                            <button
                                onClick={() => handleSendWa(firstPendaftar)}
                                className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                title="Kirim Bukti Pendaftaran via WA"
                            >
                                <i className="bi bi-whatsapp"></i> Kirim Bukti WA
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                            title={`Cetak Formulir ke Kertas ${paperSize} (Vektor Tajam)`}
                        >
                            <i className="bi bi-printer-fill"></i>{' '}
                            {isBulk ? `Cetak Semua (${items.length})` : `Cetak Formulir (${paperSize})`}
                        </button>
                    </div>
                </div>

                {/* Printable Document Container */}
                <div className="print-modal-scroll-wrapper flex-grow overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-200/70 flex flex-col items-center justify-start print:p-0 print:bg-white print:overflow-visible">
                    <div
                        ref={printAreaRef}
                        id="psb-print-form"
                        className="w-fit min-w-full flex flex-col items-center space-y-6 print:space-y-0 print:block print:w-full"
                    >
                        {items.map((pendaftar, idx) => (
                            <PsbApplicantVectorSheet
                                key={pendaftar.id}
                                pendaftar={pendaftar}
                                settings={settings}
                                paperSize={paperSize}
                                scaleMode={scaleMode}
                                isLastItem={idx === items.length - 1}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
