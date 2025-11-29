
import React from 'react';
import { Santri, Tagihan, PondokSettings } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';
import { PrintHeader } from '../../common/PrintHeader';

export const SuratTagihanTemplate: React.FC<{ santri: Santri; tunggakan: Tagihan[]; total: number; settings: PondokSettings; }> = ({ santri, tunggakan, total, settings }) => {
    const bendahara = "Bendahara Pondok";
    return (
        <div className="font-sans text-black p-4 flex flex-col h-full justify-between" style={{ fontSize: '11pt', lineHeight: '1.6' }}>
            <div>
                <PrintHeader settings={settings} title="PEMBERITAHUAN TUNGGAKAN" />
                <div className="my-6">
                    <div className="flow-root">
                        <div className="float-left">
                            <p>No: ....../SP/PP-AH/...../2024</p>
                            <p>Hal: Pemberitahuan Tunggakan</p>
                        </div>
                        <div className="float-right">
                            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    <div className="mt-8">
                        <p>Kepada Yth.,</p>
                        <p className="font-semibold">Bapak/Ibu Orang Tua/Wali dari Ananda:</p>
                        <table className="my-2 ml-4">
                            <tbody>
                                <tr><td className="pr-4">Nama</td><td>: {santri.namaLengkap}</td></tr>
                                <tr><td>NIS</td><td>: {santri.nis}</td></tr>
                                <tr><td>Rombel</td><td>: {settings.rombel.find(r=>r.id === santri.rombelId)?.nama}</td></tr>
                            </tbody>
                        </table>
                        <p>di Tempat</p>
                    </div>
                    
                    <p className="mt-6 whitespace-pre-wrap">{settings.suratTagihanPembuka}</p>
                    
                    <table className="w-full my-4 border-collapse border border-black text-sm">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="p-2 border border-black">No</th>
                                <th className="p-2 border border-black text-left">Deskripsi Tagihan</th>
                                <th className="p-2 border border-black text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tunggakan.map((t, i) => (
                                <tr key={t.id}>
                                    <td className="p-2 border border-black text-center">{i + 1}</td>
                                    <td className="p-2 border border-black">{t.deskripsi}</td>
                                    <td className="p-2 border border-black text-right">{formatRupiah(t.nominal)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colSpan={2} className="p-2 border border-black text-right font-bold">TOTAL TUNGGAKAN</th>
                                <th className="p-2 border border-black text-right font-bold">{formatRupiah(total)}</th>
                            </tr>
                        </tfoot>
                    </table>

                    {settings.suratTagihanCatatan && (
                        <div className="mt-4 p-2 border-l-4 border-gray-300 bg-gray-100 text-sm">
                            <p className="font-bold underline">Catatan:</p>
                            <p className="whitespace-pre-wrap">{settings.suratTagihanCatatan}</p>
                        </div>
                    )}
                    
                    <p className="mt-4 whitespace-pre-wrap">{settings.suratTagihanPenutup}</p>

                    <div className="mt-8 text-center float-right w-72">
                        <p>{bendahara}</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline">( ............................................ )</p>
                    </div>
                </div>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-400 text-center text-[8pt] text-gray-500 italic w-full clear-both">
                dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
            </div>
        </div>
    );
};