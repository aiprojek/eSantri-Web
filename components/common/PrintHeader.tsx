import React from 'react';
import { PondokSettings } from '../../types';

export const PrintHeader: React.FC<{ settings: PondokSettings; title: string; compact?: boolean }> = ({ settings, title, compact = false }) => (
    <div className={compact ? "mb-2" : "mb-4"}>
        <div className="flex justify-between items-center text-black">
            <div className={`${compact ? 'w-14 h-14' : 'w-20 h-20'} flex justify-center items-center`}>
                {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />}
            </div>
            <div className="text-center px-4">
                <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold`}>{settings.namaPonpes}</h2>
                <p className={compact ? 'text-xs' : 'text-sm'}>{settings.alamat}</p>
                <p className="text-xs">Telp: {settings.telepon} | Website: {settings.website}</p>
            </div>
            <div className={`${compact ? 'w-14 h-14' : 'w-20 h-20'} flex justify-center items-center`}>
                {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />}
            </div>
        </div>
        <hr className={`${compact ? 'my-2' : 'my-4'} border-t-2 border-black`}/>
        <h3 className={`print-meta print-header-subtitle ${compact ? 'text-base' : 'text-xl'} font-semibold uppercase text-center text-black`}>{title}</h3>
    </div>
);
