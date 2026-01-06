
import React, { useRef } from 'react';
import { PondokSettings, TenagaPengajar } from '../../../types';

interface TabUmumProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    activeTeachers: TenagaPengajar[];
}

const LogoUploader: React.FC<{
    label: string;
    logoUrl?: string;
    onLogoChange: (url: string) => void;
}> = ({ label, logoUrl, onLogoChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onLogoChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-center gap-4">
                <img 
                    src={logoUrl || 'https://placehold.co/100x100/e2e8f0/334155?text=Logo'} 
                    alt={label} 
                    className="w-20 h-20 object-contain rounded-md border bg-gray-100 p-1"
                />
                <div className="flex-grow space-y-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">URL Logo</label>
                        <input
                            type="text"
                            placeholder="https://example.com/logo.png"
                            value={logoUrl?.startsWith('data:') ? '' : logoUrl || ''}
                            onChange={(e) => onLogoChange(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-sm text-white bg-gray-600 hover:bg-gray-700 font-medium px-4 py-2 rounded-md"
                        >
                            Upload
                        </button>
                        {logoUrl && (
                             <button
                                type="button"
                                onClick={() => onLogoChange('')}
                                className="text-sm text-red-700 hover:text-red-900 font-medium px-4 py-2 rounded-md bg-red-100"
                            >
                                Hapus
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TabUmum: React.FC<TabUmumProps> = ({ localSettings, handleInputChange, activeTeachers }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Informasi Umum</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Nama Yayasan</label>
                    <input type="text" value={localSettings.namaYayasan} onChange={(e) => handleInputChange('namaYayasan', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                </div>
                 <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Nama Ponpes</label>
                    <input type="text" value={localSettings.namaPonpes} onChange={(e) => handleInputChange('namaPonpes', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Mudir Aam</label>
                    <select value={localSettings.mudirAamId || ''} onChange={(e) => handleInputChange('mudirAamId', e.target.value ? parseInt(e.target.value) : undefined)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                         <option value="">-- Pilih Mudir Aam --</option>
                         {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">NSPP</label>
                    <input type="text" value={localSettings.nspp} onChange={(e) => handleInputChange('nspp', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">NPSN</label>
                    <input type="text" value={localSettings.npsn} onChange={(e) => handleInputChange('npsn', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Telepon</label>
                    <input type="tel" value={localSettings.telepon} onChange={(e) => handleInputChange('telepon', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                </div>
                 <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Website</label>
                    <input type="url" value={localSettings.website} onChange={(e) => handleInputChange('website', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                </div>
                 <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                    <input type="email" value={localSettings.email} onChange={(e) => handleInputChange('email', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                </div>
                <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-medium text-gray-700">Alamat</label>
                    <textarea value={localSettings.alamat} onChange={(e) => handleInputChange('alamat', e.target.value)} rows={2} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"></textarea>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t mt-6">
                    <LogoUploader 
                        label="Logo Yayasan"
                        logoUrl={localSettings.logoYayasanUrl}
                        onLogoChange={(url) => handleInputChange('logoYayasanUrl', url)}
                    />
                    <LogoUploader 
                        label="Logo Pondok Pesantren"
                        logoUrl={localSettings.logoPonpesUrl}
                        onLogoChange={(url) => handleInputChange('logoPonpesUrl', url)}
                    />
                </div>
            </div>
        </div>
    );
};
