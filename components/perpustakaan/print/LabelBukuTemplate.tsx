
import React from 'react';
import { Buku, PondokSettings } from '../../../types';

interface LabelBukuTemplateProps {
    buku: Buku;
    settings: PondokSettings;
    width?: number; // cm
    height?: number; // cm
}

export const LabelBukuTemplate: React.FC<LabelBukuTemplateProps> = ({ buku, settings, width = 3, height = 4 }) => {
    const cardStyle: React.CSSProperties = {
        width: `${width}cm`,
        height: `${height}cm`,
        border: '1px solid #000',
        padding: '0.1cm',
        fontFamily: 'sans-serif',
        breakInside: 'avoid',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden'
    };

    // Call Number Logic
    const penulisCode = (buku.penulis || 'XXX').substring(0, 3).toUpperCase();
    const judulCode = (buku.judul || 'X').substring(0, 1).toLowerCase();

    return (
        <div style={cardStyle} className="text-black">
            {/* Header / Instansi */}
            <div className="text-[5pt] font-bold w-full border-b border-black pb-0.5 leading-none mb-1 truncate">
                {settings.namaPonpes.substring(0, 15)}
            </div>

            {/* Content Core */}
            <div className="flex flex-col gap-0.5 items-center justify-center flex-grow w-full">
                {/* Kode Buku / Klasifikasi */}
                <div className="font-bold text-[10pt] leading-none truncate w-full">
                    {buku.kodeBuku.split('-')[0]} 
                </div>
                
                {/* Author Mark */}
                <div className="font-bold text-[10pt] leading-none truncate w-full">
                    {penulisCode}
                </div>

                {/* Title Mark */}
                <div className="text-[10pt] leading-none truncate w-full">
                    {judulCode}
                </div>
            </div>

            {/* Footer / Rak Info */}
            <div className="w-full bg-black text-white text-[6pt] py-0.5 font-bold mt-1 overflow-hidden truncate">
                RAK: {buku.lokasiRak || '?'}
            </div>
            
             {/* Full Code for verification */}
             <div className="text-[4pt] mt-0.5 w-full truncate border-t border-black pt-0.5">
                {buku.kodeBuku}
            </div>
        </div>
    );
};
