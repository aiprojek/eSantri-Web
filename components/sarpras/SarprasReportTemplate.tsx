
import React from 'react';
import { PondokSettings, Inventaris } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { formatRupiah, formatDate } from '../../utils/formatters';

interface SarprasReportTemplateProps {
    settings: PondokSettings;
    assets: Inventaris[];
    filterTitle?: string;
    filterLokasi?: string;
    penanggungJawabLaporan?: string;
}

export const SarprasReportTemplate: React.FC<SarprasReportTemplateProps> = ({
    settings,
    assets,
    filterTitle,
    filterLokasi,
    penanggungJawabLaporan
}) => {
    // Hitung Ringkasan
    const totalItem = assets.length;
    const totalNilai = assets.reduce((sum, item) => sum + (Number(item.hargaPerolehan) || 0), 0);
    const nilaiWakaf = assets.filter(a => a.sumber === 'Wakaf').reduce((sum, item) => sum + (Number(item.hargaPerolehan) || 0), 0);
    const kondisiBaik = assets.filter(a => a.kondisi === 'Baik').length;
    const kondisiRusakRingan = assets.filter(a => a.kondisi === 'Rusak Ringan').length;
    const kondisiRusakBerat = assets.filter(a => a.kondisi === 'Rusak Berat' || a.kondisi === 'Afkir').length;

    const isKirMode = Boolean(filterLokasi && filterLokasi.trim() !== '');
    const reportTitle = isKirMode
        ? `KARTU INVENTARIS RUANGAN (KIR) — ${filterLokasi?.toUpperCase()}`
        : 'LAPORAN DATA ASET & INVENTARIS SARPRAS';

    const mudirFromTeacher = settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId)?.nama;
    const namaMudir = settings.namaMudir || mudirFromTeacher || '........................................';
    const kota = settings.kabupatenKota || settings.alamat?.split(',')[1]?.trim() || 'Tempat';
    const picFromAssets = filterLokasi
        ? assets.find(a => a.penanggungJawab?.trim())?.penanggungJawab
        : undefined;
    const namaPic = penanggungJawabLaporan || picFromAssets || '........................................';

    return (
        <div
            className="font-sans text-black p-6 bg-white printable-content-wrapper"
            style={{
                width: '21cm',
                margin: '0 auto',
                boxSizing: 'border-box'
            }}
        >
            <PrintHeader settings={settings} title={reportTitle} />
                
            <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-2 text-xs">
                <div className="space-y-0.5">
                    <p>Cakupan Laporan: <strong>{filterTitle || 'Semua Aset'}</strong></p>
                    {isKirMode && <p>Lokasi / Ruangan: <strong>{filterLokasi}</strong></p>}
                    <p>Tanggal Cetak: {formatDate(new Date().toISOString())}</p>
                </div>
                <div className="text-right space-y-0.5">
                    <p>Total Terdaftar: <strong>{totalItem} Item Inventaris</strong></p>
                    <p>Total Valuasi Perolehan: <strong>{formatRupiah(totalNilai)}</strong></p>
                    {nilaiWakaf > 0 && <p>Valuasi Aset Wakaf: <strong>{formatRupiah(nilaiWakaf)}</strong></p>}
                </div>
            </div>

            <div className="mb-4 text-[11px] flex flex-wrap gap-3">
                <span className="bg-green-50 px-2.5 py-1 border border-green-400 rounded font-medium">Kondisi Baik: <strong>{kondisiBaik}</strong></span>
                <span className="bg-yellow-50 px-2.5 py-1 border border-yellow-400 rounded font-medium">Rusak Ringan: <strong>{kondisiRusakRingan}</strong></span>
                <span className="bg-red-50 px-2.5 py-1 border border-red-400 rounded font-medium">Rusak Berat / Afkir: <strong>{kondisiRusakBerat}</strong></span>
            </div>

            <table className="w-full border-collapse border border-black text-[11px]">
                <thead className="bg-gray-200 uppercase">
                    <tr>
                        <th className="border border-black p-1.5 w-8 text-center">No</th>
                        <th className="border border-black p-1.5 text-left">Kode &amp; Nama Aset</th>
                        <th className="border border-black p-1.5 text-left">Kategori &amp; Sumber</th>
                        <th className="border border-black p-1.5 text-left">Lokasi &amp; PIC</th>
                        <th className="border border-black p-1.5 text-center">Kondisi</th>
                        <th className="border border-black p-1.5 text-center">Jml / Luas</th>
                        <th className="border border-black p-1.5 text-right">Nilai Perolehan</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.length > 0 ? (
                        assets.map((item, idx) => (
                            <tr key={item.id} className="break-inside-avoid">
                                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-black p-1.5">
                                    <div className="font-bold">{item.nama}</div>
                                    <div className="text-[9px] text-gray-700 font-mono">{item.kode}</div>
                                    {item.merkSpesifikasi && (
                                        <div className="text-[9px] text-gray-600 italic">{item.merkSpesifikasi}</div>
                                    )}
                                </td>
                                <td className="border border-black p-1.5">
                                    <div className="font-semibold">{item.kategori || '-'}</div>
                                    <div className="text-[9px] text-gray-600">
                                        {item.sumber} {item.tanggalPerolehan ? `(${item.tanggalPerolehan.slice(0, 4)})` : ''}
                                    </div>
                                    {item.nadzirWakaf && (
                                        <div className="text-[9px] text-gray-600">Wakif/Nadzir: {item.nadzirWakaf}</div>
                                    )}
                                </td>
                                <td className="border border-black p-1.5">
                                    <div>{item.lokasi || '-'}</div>
                                    {item.penanggungJawab && (
                                        <div className="text-[9px] text-gray-600">PIC: {item.penanggungJawab}</div>
                                    )}
                                </td>
                                <td className="border border-black p-1.5 text-center font-medium">
                                    {item.kondisi}
                                    {item.statusPinjam === 'Dipinjam' && (
                                        <div className="text-[8px] uppercase font-bold text-gray-700">(Dipinjam)</div>
                                    )}
                                </td>
                                <td className="border border-black p-1.5 text-center">
                                    {item.jenis === 'Bergerak' 
                                        ? `${item.jumlah} ${item.satuan || 'Unit'}` 
                                        : `${item.luas || '-'} m²`
                                    }
                                    {item.jenis === 'Tidak Bergerak' && item.legalitas && (
                                        <div className="text-[8px] text-gray-600">{item.legalitas}</div>
                                    )}
                                </td>
                                <td className="border border-black p-1.5 text-right font-mono">
                                    {formatRupiah(item.hargaPerolehan)}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="border border-black p-8 text-center italic text-gray-500">
                                Tidak ada data aset untuk ditampilkan.
                            </td>
                        </tr>
                    )}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td colSpan={6} className="border border-black p-2 text-right">TOTAL NILAI PEROLEHAN ASET</td>
                        <td className="border border-black p-2 text-right font-mono">{formatRupiah(totalNilai)}</td>
                    </tr>
                </tfoot>
            </table>

            {isKirMode && (
                <div className="mt-3 p-2 border border-black text-[10px] bg-gray-50">
                    <strong>Perhatian Tata Tertib Inventaris Ruangan:</strong> Seluruh barang inventaris yang tercantum dalam Kartu Inventaris Ruangan (KIR) ini merupakan amanah pondok pesantren. Dilarang memindahkan barang keluar ruangan tanpa izin tertulis dari Bagian Sarana &amp; Prasarana.
                </div>
            )}

            {/* Tanda Tangan */}
            <div className="flex justify-between items-end mt-8 px-4 text-xs break-inside-avoid">
                <div className="text-center w-56">
                    <p>Mengetahui,</p>
                    <p>Pimpinan Pondok Pesantren</p>
                    <div className="h-16"></div>
                    <p className="border-b border-black pb-0.5 font-bold">{namaMudir}</p>
                </div>
                <div className="text-center w-56">
                    <p>{kota}, {formatDate(new Date().toISOString())}</p>
                    <p>{isKirMode ? 'Penanggung Jawab Ruangan / Sarpras' : 'Kepala Bagian Sarana & Prasarana'}</p>
                    <div className="h-16"></div>
                    <p className="border-b border-black pb-0.5 font-bold">{namaPic}</p>
                </div>
            </div>

            <div className="report-signature-footer print-meta border-t border-gray-400 text-center text-[8pt] text-gray-500 italic w-full mt-4 pt-1">
                Dicetak melalui Sistem Informasi Manajemen Pesantren eSantri Web
            </div>
        </div>
    );
};

