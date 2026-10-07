import React from 'react';
import { PondokSettings } from '../../types';

export const formatCustomFieldTag = (label: string): string => {
    const clean = (label || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return clean ? `{${clean}}` : '{INFO_TAMBAHAN}';
};

export const getKopIdentityLines = (settings: PondokSettings): string[] => {
    const items: string[] = [];
    if (settings.nspp && settings.nspp.trim() && settings.showNsppInKop !== false) {
        items.push(`NSPP: ${settings.nspp.trim()}`);
    }
    if (settings.npsn && settings.npsn.trim() && settings.showNpsnInKop !== false) {
        items.push(`NPSN: ${settings.npsn.trim()}`);
    }
    if (Array.isArray(settings.customInfoFields)) {
        settings.customInfoFields.forEach((field) => {
            if (field && field.showInKop && field.value && field.value.trim()) {
                const label = field.label?.trim();
                items.push(label ? `${label}: ${field.value.trim()}` : field.value.trim());
            }
        });
    }
    return items;
};

export const PrintHeader: React.FC<{ settings: PondokSettings; title?: string; compact?: boolean }> = ({ settings, title, compact = false }) => {
    const kopIdentityItems = getKopIdentityLines(settings);
    const contactItems = [
        settings.telepon?.trim() ? `Telp: ${settings.telepon.trim()}` : '',
        settings.email?.trim() ? `Email: ${settings.email.trim()}` : '',
        settings.website?.trim() ? `Website: ${settings.website.trim()}` : '',
    ].filter(Boolean);

    return (
        <div className={compact ? "mb-2" : "mb-4"}>
            <div className="flex justify-between items-center text-black">
                <div className={`${compact ? 'w-14 h-14' : 'w-20 h-20'} flex justify-center items-center shrink-0`}>
                    {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />}
                </div>
                <div className="text-center px-4 flex-1">
                    {settings.namaYayasan && (
                        <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold uppercase tracking-wide leading-tight`}>
                            {settings.namaYayasan}
                        </p>
                    )}
                    <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold leading-tight`}>{settings.namaPonpes}</h2>
                    {kopIdentityItems.length > 0 && (
                        <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold mt-0.5`}>
                            {kopIdentityItems.join(' | ')}
                        </p>
                    )}
                    <p className={`${compact ? 'text-[11px]' : 'text-xs'} mt-0.5 leading-snug`}>{settings.alamat}</p>
                    {contactItems.length > 0 && (
                        <p className="text-[11px] leading-snug">{contactItems.join(' | ')}</p>
                    )}
                </div>
                <div className={`${compact ? 'w-14 h-14' : 'w-20 h-20'} flex justify-center items-center shrink-0`}>
                    {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />}
                </div>
            </div>
            <hr className={`${compact ? 'my-2' : 'my-3'} border-t-2 border-black`} />
            {title && (
                <h3 className={`print-meta print-header-subtitle ${compact ? 'text-base' : 'text-xl'} font-semibold uppercase text-center text-black`}>
                    {title}
                </h3>
            )}
        </div>
    );
};
