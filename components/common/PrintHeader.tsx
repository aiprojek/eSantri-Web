
import React from 'react';
import { PondokSettings } from '../../types';

export const PrintHeader: React.FC<{ settings: PondokSettings; title: string }> = ({ settings, title }) => (
    <div className="mb-4 pdf-ignore-context">
        <div className="flex justify-between items-center text-black">
            <div className="w-20 h-20 flex justify-center items-center">
                {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" />}
            </div>
            <div className="text-center px-4">
                <h2 className="text-2xl font-bold">{settings.namaYayasan}</h2>
                <h2 className="text-2xl font-bold">{settings.namaPonpes}</h2>
                <p className="text-sm">{settings.alamat}</p>
                <p className="text-xs">Telp: {settings.telepon} | Website: {settings.website}</p>
            </div>
            <div className="w-20 h-20 flex justify-center items-center">
                {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" />}
            </div>
        </div>
        <hr className="my-4 border-t-2 border-black"/>
        <h3 className="text-xl font-semibold uppercase text-center text-black">{title}</h3>
    </div>
);
