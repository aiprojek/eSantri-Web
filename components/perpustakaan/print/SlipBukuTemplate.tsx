
import React from 'react';
import { Buku, PondokSettings } from '../../../types';

interface SlipBukuTemplateProps {
    buku: Buku;
    settings: PondokSettings;
    width?: number; // cm
    height?: number; // cm
}

export const SlipBukuTemplate: React.FC<SlipBukuTemplateProps> = ({ buku, settings, width = 7.5, height = 12 }) => {
    const cardStyle: React.CSSProperties = {
        width: `${width}cm`,
        height: `${height}cm`,
        border: '1px solid black',
        padding: '0.5cm',
        fontFamily: 'sans-serif',
        fontSize: '10pt',
        breakInside: 'avoid',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        overflow: 'hidden'
    };

    return (
        <div style={cardStyle} className="flex flex-col relative">
            <div className="text-center border-b border-black pb-1 mb-1">
                <div className="font-bold text-[8pt] uppercase truncate">{settings.namaPonpes}</div>
                <div className="font-bold text-[10pt]">KARTU BUKU</div>
            </div>
            
            <div className="mb-2 text-[8pt]">
                <div className="flex"><span className="w-12 shrink-0">Kode</span><span className="truncate">: {buku.kodeBuku}</span></div>
                <div className="flex"><span className="w-12 shrink-0">Judul</span><span className="truncate font-bold">: {buku.judul}</span></div>
                <div className="flex"><span className="w-12 shrink-0">Penulis</span><span className="truncate">: {buku.penulis || '-'}</span></div>
            </div>

            <div className="flex-grow border border-black relative">
                <table className="w-full text-[8pt] text-center absolute inset-0">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black h-5">
                            <th className="border-r border-black w-1/4">Tgl</th>
                            <th className="border-r border-black w-1/2">Peminjam</th>
                            <th className="">Paraf</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {/* Render rows based on approximate height available */}
                        {[...Array(10)].map((_, i) => (
                            <tr key={i} className="h-5">
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
