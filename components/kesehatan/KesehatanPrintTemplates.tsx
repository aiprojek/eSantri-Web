import React from 'react';
import { KesehatanRecord, Santri, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { formatDate } from '../../utils/formatters';

interface TemplateProps {
    record: KesehatanRecord;
    santri: Santri;
    settings: PondokSettings;
}

export type DocumentType = 'surat-sakit' | 'surat-rujukan' | 'surat-pulang';

/**
 * 1. SURAT KETERANGAN SAKIT (A5 Landscape)
 */
export const SuratSakitTemplate: React.FC<TemplateProps> = ({ record, santri, settings }) => {
    const kamarName = santri.kamarId ? settings.kamar.find(k => k.id === santri.kamarId)?.nama : '-';

    return (
        <div className="bg-white p-8 font-sans text-black printable-content-wrapper" style={{ width: '21cm', minHeight: '14.8cm' }}>
            <PrintHeader settings={settings} title="SURAT KETERANGAN SAKIT" compact />
            
            <div className="mt-4 text-xs leading-relaxed">
                <p>Yang bertanda tangan di bawah ini, Petugas Poskestren / Layanan Kesehatan {settings.namaPonpes} menerangkan bahwa:</p>
                
                <table className="w-full my-3 ml-2 text-xs">
                    <tbody>
                        <tr><td className="w-32 font-bold py-0.5">Nama Santri</td><td>: {santri.namaLengkap}</td></tr>
                        <tr><td className="font-bold py-0.5">NIS</td><td>: {santri.nis}</td></tr>
                        <tr><td className="font-bold py-0.5">Kamar / Asrama</td><td>: {kamarName}</td></tr>
                        <tr><td className="font-bold py-0.5">Jenis Kelamin</td><td>: {santri.jenisKelamin}</td></tr>
                    </tbody>
                </table>

                {/* Tanda Vital jika tercatat */}
                {(record.suhuTubuh || record.tekananDarah || record.beratBadan) && (
                    <div className="my-2 p-2 bg-gray-50 border border-gray-200 rounded flex gap-4 text-xs">
                        {record.suhuTubuh ? <div><span className="text-gray-500">Suhu Tubuh:</span> <strong>{record.suhuTubuh} °C</strong></div> : null}
                        {record.tekananDarah ? <div><span className="text-gray-500">Tekanan Darah:</span> <strong>{record.tekananDarah} mmHg</strong></div> : null}
                        {record.beratBadan ? <div><span className="text-gray-500">Berat Badan:</span> <strong>{record.beratBadan} kg</strong></div> : null}
                    </div>
                )}

                <p className="mt-2">Berdasarkan hasil pemeriksaan medis pada tanggal <strong>{formatDate(record.tanggal)}</strong>, santri tersebut didiagnosa:</p>
                <div className="font-bold text-sm my-1.5 ml-2 text-gray-900 uppercase">
                    • {record.diagnosa || 'Pemeriksaan Kesehatan Umum'}
                </div>
                
                <p>
                    Dinyatakan <strong>PERLU ISTIRAHAT / {record.status.toUpperCase()}</strong>
                    {record.lamaIstirahatHari ? ` selama ${record.lamaIstirahatHari} hari terhitung sejak tanggal pemeriksaan` : ''} demi proses pemulihan kesehatan dan dibebaskan sementara dari kegiatan belajar / keasramaan.
                </p>
                
                {record.tindakan && (
                    <div className="mt-2 p-2 border border-gray-200 rounded bg-gray-50 text-[11px]">
                        <strong>Tindakan / Terapi Obat:</strong> {record.tindakan}
                    </div>
                )}

                {record.catatan && (
                    <div className="mt-1.5 p-2 border border-dashed border-gray-300 rounded text-[11px] text-gray-700">
                        <strong>Catatan Petugas:</strong> {record.catatan}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end mt-6 px-2 text-xs">
                <div className="text-[10px] text-gray-500 italic max-w-xs">
                    * Harap surat ini disimpan oleh santri/musyrif asrama sebagai bukti sah dispensasi kegiatan.
                </div>
                <div className="text-center w-52">
                    <p>{settings.alamat?.split(',')[1]?.trim() || 'Tempat'}, {formatDate(record.tanggal)}</p>
                    <p className="mt-0.5">Petugas Pemeriksa,</p>
                    <div className="h-14"></div>
                    <p className="font-bold underline">{record.pemeriksa || 'Petugas Poskestren'}</p>
                    <p className="text-[10px] text-gray-600">Poskestren {settings.namaPonpes}</p>
                </div>
            </div>
            
            <div className="mt-4 pt-2 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic">
                Sistem Informasi Pesantren eSantri Web | Dicetak resmi oleh Poskestren {settings.namaPonpes}
            </div>
        </div>
    );
};

/**
 * 2. SURAT PENGANTAR RUJUKAN FASKES (Puskesmas / RS / Klinik Luar)
 */
export const SuratRujukanTemplate: React.FC<TemplateProps> = ({ record, santri, settings }) => {
    const kamarName = santri.kamarId ? settings.kamar.find(k => k.id === santri.kamarId)?.nama : '-';

    return (
        <div className="bg-white p-8 font-sans text-black printable-content-wrapper" style={{ width: '21cm', minHeight: '29.7cm' }}>
            <PrintHeader settings={settings} title="SURAT PENGANTAR RUJUKAN MEDIS" />
            
            <div className="mt-6 text-sm leading-relaxed">
                <div className="flex justify-between mb-4">
                    <div>
                        <p>Nomor: {record.id ? `00${record.id.toString().slice(-4)}/MED/RUJUK/${new Date(record.tanggal).getFullYear()}` : '-'}</p>
                        <p>Lampiran: -</p>
                        <p>Perihal: <strong>Rujukan Pasien Santri</strong></p>
                    </div>
                    <div className="text-right">
                        <p>{settings.alamat?.split(',')[1]?.trim() || 'Pondok'}, {formatDate(record.tanggal)}</p>
                    </div>
                </div>

                <div className="my-4">
                    <p>Kepada Yth.</p>
                    <p className="font-bold">{record.faskesRujukan || 'Dokter / Tenaga Medis Pemeriksa'}</p>
                    <p>Di Fasilitas Pelayanan Kesehatan / Rumah Sakit / Puskesmas</p>
                </div>

                <p className="mt-4">
                    Dengan hormat,<br/>
                    Bersama surat ini, kami menghadapkan pasien santri kami dari Pondok Pesantren {settings.namaPonpes} untuk mendapatkan pemeriksaan, evaluasi medis, dan penanganan lebih lanjut:
                </p>

                <div className="my-4 border border-gray-300 rounded-lg p-4 bg-gray-50/50">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr><td className="w-36 font-semibold py-1">Nama Lengkap</td><td>: <strong>{santri.namaLengkap}</strong></td></tr>
                            <tr><td className="font-semibold py-1">NIS / NISN</td><td>: {santri.nis} {santri.nisn ? `/ ${santri.nisn}` : ''}</td></tr>
                            <tr><td className="font-semibold py-1">Jenis Kelamin</td><td>: {santri.jenisKelamin}</td></tr>
                            <tr><td className="font-semibold py-1">Tempat, Tgl Lahir</td><td>: {santri.tempatLahir}, {formatDate(santri.tanggalLahir)}</td></tr>
                            <tr><td className="font-semibold py-1">Asrama / Kamar</td><td>: {kamarName}</td></tr>
                            <tr><td className="font-semibold py-1">Nama Wali / No. HP</td><td>: {santri.namaWali || santri.namaAyah || '-'} ({santri.teleponWali || santri.teleponAyah || '-'})</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="space-y-3 mt-4">
                    <div className="border-l-4 border-teal-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-teal-800">1. Hasil Pemeriksaan Fisik & Tanda Vital</h4>
                        <div className="mt-1 flex flex-wrap gap-4 text-xs">
                            <span className="bg-gray-100 px-2.5 py-1 rounded border border-gray-300">Suhu Tubuh: <strong>{record.suhuTubuh ? `${record.suhuTubuh} °C` : '-'}</strong></span>
                            <span className="bg-gray-100 px-2.5 py-1 rounded border border-gray-300">Tekanan Darah: <strong>{record.tekananDarah ? `${record.tekananDarah} mmHg` : '-'}</strong></span>
                            <span className="bg-gray-100 px-2.5 py-1 rounded border border-gray-300">Berat Badan: <strong>{record.beratBadan ? `${record.beratBadan} kg` : '-'}</strong></span>
                        </div>
                    </div>

                    <div className="border-l-4 border-amber-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-amber-800">2. Anamnesa & Keluhan Utama</h4>
                        <p className="text-sm mt-0.5">{record.keluhan || '-'}</p>
                    </div>

                    <div className="border-l-4 border-blue-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-blue-800">3. Dugaan Diagnosa Sementara di Poskestren</h4>
                        <p className="text-sm font-bold text-blue-900 mt-0.5">{record.diagnosa || '-'}</p>
                    </div>

                    <div className="border-l-4 border-purple-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-purple-800">4. Tindakan & Terapi Awal yang Diberikan</h4>
                        <p className="text-sm mt-0.5">{record.tindakan || 'Perawatan pertama dan istirahat di Poskestren'}</p>
                    </div>

                    <div className="border-l-4 border-rose-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-rose-800">5. Alasan Rujukan</h4>
                        <p className="text-sm mt-0.5">{record.alasanRujukan || 'Memerlukan pemeriksaan spesialis / sarana diagnostik penunjang lanjutan yang belum tersedia di Poskestren'}</p>
                    </div>
                </div>

                <p className="mt-6">
                    Demikian surat rujukan ini kami sampaikan. Kami sangat berterima kasih atas perhatian, kerjasama, dan penanganan medis terbaik yang diberikan kepada santri kami.
                </p>

                <div className="flex justify-between items-center mt-12 px-4">
                    <div className="w-56 text-center text-xs">
                        <p>Pendamping Pasien,</p>
                        <div className="h-16"></div>
                        <p className="border-b border-black font-semibold">( .................................................. )</p>
                        <p className="text-[10px] text-gray-500">Ustadz / Petugas Pendamping</p>
                    </div>
                    <div className="w-56 text-center text-xs">
                        <p>{settings.alamat?.split(',')[1]?.trim() || 'Tempat'}, {formatDate(record.tanggal)}</p>
                        <p>Petugas Poskestren,</p>
                        <div className="h-16"></div>
                        <p className="font-bold underline">{record.pemeriksa || 'Petugas Medis Poskestren'}</p>
                        <p className="text-[10px] text-gray-600">{settings.namaPonpes}</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic">
                Dokumen Resmi Poskestren {settings.namaPonpes} | Terintegrasi eSantri Web
            </div>
        </div>
    );
};

/**
 * 3. SURAT REKOMENDASI ISTIRAHAT DI RUMAH (Izin Pulang Sakit)
 */
export const SuratIzinPulangTemplate: React.FC<TemplateProps> = ({ record, santri, settings }) => {
    const kamarName = santri.kamarId ? settings.kamar.find(k => k.id === santri.kamarId)?.nama : '-';
    const durasiHari = record.lamaIstirahatHari || 3;

    // Perkiraan tanggal kembali
    const tglMulai = new Date(record.tanggal);
    const tglKembali = new Date(tglMulai);
    tglKembali.setDate(tglKembali.getDate() + durasiHari);

    return (
        <div className="bg-white p-8 font-sans text-black printable-content-wrapper" style={{ width: '21cm', minHeight: '29.7cm' }}>
            <PrintHeader settings={settings} title="SURAT REKOMENDASI ISTIRAHAT DI RUMAH (IZIN PULANG SAKIT)" />
            
            <div className="mt-6 text-sm leading-relaxed">
                <p>
                    Berdasarkan hasil pemeriksaan fisik dan evaluasi medis yang dilakukan oleh Tim Kesehatan Poskestren {settings.namaPonpes}, menerangkan bahwa:
                </p>

                <div className="my-4 border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr><td className="w-36 font-semibold py-1">Nama Santri</td><td>: <strong>{santri.namaLengkap}</strong></td></tr>
                            <tr><td className="font-semibold py-1">NIS</td><td>: {santri.nis}</td></tr>
                            <tr><td className="font-semibold py-1">Kamar / Asrama</td><td>: {kamarName}</td></tr>
                            <tr><td className="font-semibold py-1">Orang Tua / Wali</td><td>: {santri.namaWali || santri.namaAyah || '-'} ({santri.teleponWali || santri.teleponAyah || '-'})</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="space-y-2 mt-4 text-sm">
                    <p>
                        Santri tersebut terdiagnosa mengalami: <strong className="text-base text-red-700">{record.diagnosa}</strong>
                    </p>
                    <p>
                        Dengan mempertimbangkan kondisi klinis dan perlunya isolasi/perawatan intensif dari orang tua keluarga, santri bersangkutan <strong>DIREKOMENDASIKAN BERISTIRAHAT DI RUMAH</strong> selama:
                    </p>
                    <div className="p-3 bg-teal-50 border border-teal-300 rounded-lg my-3 text-center">
                        <span className="text-xl font-bold text-teal-900">{durasiHari} HARI</span>
                        <p className="text-xs text-teal-700 mt-1">
                            Terhitung sejak <strong>{formatDate(record.tanggal)}</strong> s.d. diharapkan kembali ke pondok pada <strong>{formatDate(tglKembali.toISOString().split('T')[0])}</strong>
                        </p>
                    </div>
                </div>

                <div className="mt-4 p-3 border border-gray-300 rounded bg-gray-50 text-xs space-y-1">
                    <p className="font-bold">Anjuran & Petunjuk Perawatan di Rumah:</p>
                    <p>• {record.tindakan || 'Menjaga asupan gizi, istirahat cukup, dan mengonsumsi obat sesuai resep.'}</p>
                    {record.catatan && <p>• Catatan Tambahan: {record.catatan}</p>}
                    <p>• Apabila kondisi belum membaik menjelang jadwal kembali, wali santri dimohon segera mengonfirmasi ke pihak Poskestren / Pengasuhan Pondok.</p>
                </div>

                <p className="mt-6 text-xs text-gray-700">
                    Demikian surat rekomendasi medis ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagai pengantar perizinan ke Bagian Keamanan / Pengasuhan Santri.
                </p>

                <div className="flex justify-between items-center mt-12 px-6">
                    <div className="w-52 text-center text-xs">
                        <p>Mengetahui,</p>
                        <p>Wali Santri / Penjemput,</p>
                        <div className="h-16"></div>
                        <p className="border-b border-black font-semibold">( .................................................. )</p>
                    </div>
                    <div className="w-52 text-center text-xs">
                        <p>{settings.alamat?.split(',')[1]?.trim() || 'Tempat'}, {formatDate(record.tanggal)}</p>
                        <p>Petugas Poskestren,</p>
                        <div className="h-16"></div>
                        <p className="font-bold underline">{record.pemeriksa || 'Petugas Kesehatan'}</p>
                        <p className="text-[10px] text-gray-600">Poskestren {settings.namaPonpes}</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic">
                Dokumen Resmi eSantri Web Poskestren {settings.namaPonpes}
            </div>
        </div>
    );
};
