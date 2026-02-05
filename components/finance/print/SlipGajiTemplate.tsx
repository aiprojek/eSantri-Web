
import React from 'react';
import { PayrollRecord, PondokSettings } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';
import { PrintHeader } from '../../common/PrintHeader';
import { ReportFooter } from '../../reports/modules/Common';

export const SlipGajiTemplate: React.FC<{ record: PayrollRecord, settings: PondokSettings }> = ({ record, settings }) => {
    const periodName = new Date(record.tahun, record.bulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    return (
        <div className="font-sans text-black p-6 bg-white flex flex-col h-full justify-between printable-content-wrapper" style={{ width: '21cm', minHeight: '14.8cm' }}>
            <div>
                <PrintHeader settings={settings} title="SLIP GAJI GURU & KARYAWAN" />
                
                <div className="flex justify-between text-sm mb-4 border-b-2 border-black pb-2">
                    <div>
                        <table>
                            <tbody>
                                <tr><td className="w-24">Nama</td><td>: <strong>{record.namaGuru}</strong></td></tr>
                                <tr><td>Jabatan</td><td>: {record.jabatan}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="text-right">
                        <p>Periode: <strong>{periodName}</strong></p>
                        <p>Tgl Bayar: {new Date(record.tanggalBayar).toLocaleDateString('id-ID')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-sm">
                    {/* Penerimaan */}
                    <div>
                        <h4 className="font-bold border-b border-gray-400 mb-2">PENERIMAAN</h4>
                        <table className="w-full">
                            <tbody>
                                <tr>
                                    <td className="py-1">Gaji Pokok</td>
                                    <td className="text-right">{formatRupiah(record.gajiPokok)}</td>
                                </tr>
                                <tr>
                                    <td className="py-1">Tunjangan Jabatan</td>
                                    <td className="text-right">{formatRupiah(record.tunjanganJabatan)}</td>
                                </tr>
                                <tr>
                                    <td className="py-1">
                                        Honor Mengajar <br/>
                                        <span className="text-[10px] text-gray-500">({record.totalJamMengajar} Jam x {formatRupiah(record.honorPerJam)})</span>
                                    </td>
                                    <td className="text-right align-top">{formatRupiah(record.totalHonorJTM)}</td>
                                </tr>
                                <tr>
                                    <td className="py-1">Tunjangan Lain</td>
                                    <td className="text-right">{formatRupiah(record.tunjanganLain)}</td>
                                </tr>
                                {record.bonus > 0 && (
                                    <tr>
                                        <td className="py-1">Bonus</td>
                                        <td className="text-right">{formatRupiah(record.bonus)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Potongan */}
                    <div>
                        <h4 className="font-bold border-b border-gray-400 mb-2">POTONGAN</h4>
                        <table className="w-full">
                            <tbody>
                                {record.potonganAbsen > 0 && (
                                    <tr>
                                        <td className="py-1">Potongan Absensi</td>
                                        <td className="text-right text-red-600">{formatRupiah(record.potonganAbsen)}</td>
                                    </tr>
                                )}
                                {record.potonganLain > 0 && (
                                    <tr>
                                        <td className="py-1">Potongan Lain</td>
                                        <td className="text-right text-red-600">{formatRupiah(record.potonganLain)}</td>
                                    </tr>
                                )}
                                {(record.potonganAbsen === 0 && record.potonganLain === 0) && (
                                    <tr><td colSpan={2} className="py-2 text-center text-gray-400 italic">Tidak ada potongan</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-6 border-t-2 border-black pt-2 flex justify-between items-center bg-gray-100 p-3">
                    <div className="font-bold text-lg">TOTAL DITERIMA (Take Home Pay)</div>
                    <div className="font-bold text-xl">{formatRupiah(record.totalDiterima)}</div>
                </div>

                {record.catatan && (
                    <div className="mt-4 text-xs italic text-gray-600 border p-2 rounded">
                        Catatan: {record.catatan}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end mt-8 text-xs" style={{ breakInside: 'avoid' }}>
                <div className="text-center w-40">
                    <p>Penerima,</p>
                    <div className="h-16"></div>
                    <p className="font-bold border-b border-black">{record.namaGuru}</p>
                </div>
                <div className="text-center w-40">
                    <p>Bendahara,</p>
                    <div className="h-16"></div>
                    <p className="font-bold border-b border-black">.........................</p>
                </div>
            </div>
            
            <div className="mt-2 text-[8pt] text-gray-400 text-center italic">
                Slip ini sah dicetak dari sistem eSantri Web.
            </div>
        </div>
    );
};
