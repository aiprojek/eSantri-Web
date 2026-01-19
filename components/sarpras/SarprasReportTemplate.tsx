
import React from 'react';
import { PondokSettings, Inventaris } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { formatRupiah, formatDate } from '../../utils/formatters';
import { ReportFooter } from '../reports/modules/Common';

interface SarprasReportTemplateProps {
    settings: PondokSettings;
    assets: Inventaris[];
    filterTitle?: string;
}

export const SarprasReportTemplate: React.FC<SarprasReportTemplateProps> = ({ settings, assets, filterTitle }) => {
    // Hitung Ringkasan
    const totalItem = assets.length;
    const totalNilai = assets.reduce((sum, item) => sum + (Number(item.hargaPerolehan) || 0), 0);
    const kondisiBaik = assets.filter(a => a.kondisi === 'Baik').length;
    const kondisiRusak = assets.filter(a => a.kondisi !== 'Baik').length;

    return (
        <div className="font-sans text-black p-8 bg-white flex flex-col h-full justify-between printable-content-wrapper" style={{ width: '21cm', minHeight: '29.7cm' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN DATA ASET & INVENTARIS" />
                
                <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-2">
                    <div>
                        <p className="text-sm">Filter: <strong>{filterTitle || 'Semua Aset'}</strong></p>
                        <p className="text-sm">Dicetak: {formatDate(new Date().toISOString())}</p>
                    </div>
                    <div className="text-right text-sm">
                        <p>Total Aset: <strong>{totalItem} Item</strong></p>
                        <p>Total Valuasi: <strong>{formatRupiah(totalNilai)}</strong></p>
                    </div>
                </div>

                <div className="mb-4 text-xs flex gap-4">
                    <span className="bg-green-100 px-2 py-1 border border-green-300 rounded">Kondisi Baik: {kondisiBaik}</span>
                    <span className="bg-red-100 px-2 py-1 border border-red-300 rounded">Perlu Perbaikan/Rusak: {kondisiRusak}</span>
                </div>

                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-gray-200 uppercase">
                        <tr>
                            <th className="border border-black p-2 w-8 text-center">No</th>
                            <th className="border border-black p-2 text-left">Kode & Nama Barang</th>
                            <th className="border border-black p-2 text-left">Kategori</th>
                            <th className="border border-black p-2 text-left">Lokasi</th>
                            <th className="border border-black p-2 text-center">Kondisi</th>
                            <th className="border border-black p-2 text-center">Jml/Luas</th>
                            <th className="border border-black p-2 text-right">Nilai Aset</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.length > 0 ? (
                            assets.map((item, idx) => (
                                <tr key={item.id} className="break-inside-avoid">
                                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                                    <td className="border border-black p-2">
                                        <div className="font-bold">{item.nama}</div>
                                        <div className="text-[9px] text-gray-600 font-mono">{item.kode}</div>
                                    </td>
                                    <td className="border border-black p-2">{item.kategori}</td>
                                    <td className="border border-black p-2">{item.lokasi}</td>
                                    <td className="border border-black p-2 text-center">
                                        {item.kondisi}
                                    </td>
                                    <td className="border border-black p-2 text-center">
                                        {item.jenis === 'Bergerak' 
                                            ? `${item.jumlah} ${item.satuan || ''}` 
                                            : `${item.luas || '-'} m²`
                                        }
                                    </td>
                                    <td className="border border-black p-2 text-right">
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
                            <td colSpan={6} className="border border-black p-2 text-right">TOTAL NILAI ASET</td>
                            <td className="border border-black p-2 text-right">{formatRupiah(totalNilai)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Tanda Tangan */}
                <div className="flex justify-between items-end mt-12 px-4 text-sm break-inside-avoid">
                    <div className="text-center w-48">
                        <p>Mengetahui,</p>
                        <p>Pimpinan Pondok</p>
                        <div className="h-20"></div>
                        <p className="border-b border-black pb-1 font-bold">........................................</p>
                    </div>
                    <div className="text-center w-48">
                        <p>{settings.alamat.split(',')[1]?.trim() || 'Tempat'}, {formatDate(new Date().toISOString())}</p>
                        <p>Bagian Sarana & Prasarana</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline">........................................</p>
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};
