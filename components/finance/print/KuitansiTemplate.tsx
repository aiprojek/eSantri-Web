
import React from 'react';
import { Pembayaran, Santri, Tagihan, PondokSettings } from '../../../types';
import { formatRupiah, terbilang } from '../../../utils/formatters';
import { PrintHeader } from '../../common/PrintHeader';


export const KuitansiTemplate: React.FC<{ data: { pembayaran: Pembayaran; santri: Santri; tagihanTerkait: Tagihan[] }; settings: PondokSettings }> = ({ data, settings }) => {
    const { pembayaran, santri, tagihanTerkait } = data;
    const bendahara = "Bendahara Pondok"; // This could be a setting in the future

    return (
        <div className="font-serif text-black p-4 flex flex-col h-full justify-between" style={{ fontSize: '12pt', lineHeight: '1.6' }}>
            <div>
                <PrintHeader settings={settings} title="KUITANSI PEMBAYARAN" />
                <div className="my-4">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="align-top w-48">No. Kuitansi</td>
                                <td className="align-top w-4">:</td>
                                <td className="align-top font-semibold">PEMB-{pembayaran.id.toString().padStart(5, '0')}</td>
                            </tr>
                            <tr>
                                <td className="align-top">Telah diterima dari</td>
                                <td className="align-top">:</td>
                                <td className="align-top font-semibold">Orang Tua/Wali dari {santri.namaLengkap} (NIS: {santri.nis})</td>
                            </tr>
                            <tr>
                                <td className="align-top">Uang Sejumlah</td>
                                <td className="align-top">:</td>
                                <td className="align-top font-semibold italic capitalize">{terbilang(pembayaran.jumlah)} Rupiah</td>
                            </tr>
                            <tr>
                                <td className="align-top">Untuk Pembayaran</td>
                                <td className="align-top">:</td>
                                <td className="align-top font-semibold">
                                    <ul className="list-disc pl-5">
                                        {tagihanTerkait.map(t => <li key={t.id}>{t.deskripsi}</li>)}
                                    </ul>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between items-end mt-8">
                    <div className="p-2 border border-black text-center">
                        <p className="font-bold text-lg">Total: {formatRupiah(pembayaran.jumlah)}</p>
                    </div>
                    <div className="text-center w-72">
                        <p>{settings.alamat.split(',')[1] || 'Sumpiuh'}, {new Date(pembayaran.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p>{bendahara}</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline">( ............................................ )</p>
                    </div>
                </div>
            </div>
            <div className="mt-auto pt-2 border-t border-gray-400 text-center text-[8pt] text-gray-500 italic w-full">
                dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
            </div>
        </div>
    );
};
