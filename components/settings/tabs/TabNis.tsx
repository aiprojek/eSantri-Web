
import React from 'react';
import { PondokSettings, NisSettings } from '../../../types';

interface TabNisProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
}

export const TabNis: React.FC<TabNisProps> = ({ localSettings, setLocalSettings }) => {
    const handleNisSettingChange = <K extends keyof NisSettings>(key: K, value: NisSettings[K]) => {
        setLocalSettings(prev => ({
            ...prev,
            nisSettings: {
                ...prev.nisSettings,
                [key]: value,
            },
        }));
    };

    const handleNisJenjangConfigChange = (jenjangId: number, key: 'startNumber' | 'padding', value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;

        setLocalSettings(prev => ({
            ...prev,
            nisSettings: {
                ...prev.nisSettings,
                jenjangConfig: prev.nisSettings.jenjangConfig.map(jc => 
                    jc.jenjangId === jenjangId ? { ...jc, [key]: numValue } : jc
                )
            }
        }));
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Pengaturan Generator NIS</h2>
            <div className="space-y-6">
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Metode Pembuatan NIS</label>
                    <div className="flex flex-wrap gap-4">
                        {(['custom', 'global', 'dob'] as const).map(method => (
                            <div className="flex items-center" key={method}>
                                <input type="radio" id={`method-${method}`} name="nis-method" value={method} checked={localSettings.nisSettings.generationMethod === method} onChange={(e) => handleNisSettingChange('generationMethod', e.target.value as any)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 focus:ring-teal-500"/>
                                <label htmlFor={`method-${method}`} className="ml-2 text-sm text-gray-800">{method === 'custom' && 'Metode Kustom'}{method === 'global' && 'Metode Global'}{method === 'dob' && 'Metode Tgl. Lahir'}</label>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        {localSettings.nisSettings.generationMethod === 'custom' && 'Format bebas menggunakan variabel tahun, kode jenjang, dan nomor urut. Nomor urut direset per jenjang & tahun.'}
                        {localSettings.nisSettings.generationMethod === 'global' && 'Format standar (Tahun + Prefix + Kode Jenjang + No Urut). Nomor urut continue untuk seluruh santri.'}
                        {localSettings.nisSettings.generationMethod === 'dob' && 'Format berbasis Tanggal Lahir + Kode Jenjang + No Urut.'}
                    </p>
                </div>

                {localSettings.nisSettings.generationMethod === 'custom' && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Format NIS</label>
                            <input type="text" value={localSettings.nisSettings.format} onChange={(e) => handleNisSettingChange('format', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" />
                            <p className="mt-1 text-xs text-gray-500">Gunakan placeholder: <code>{'{TM}'}</code> (Tahun Masehi 2 digit), <code>{'{TH}'}</code> (Tahun Hijriah 2 digit), <code>{'{KODE}'}</code> (Kode Jenjang), <code>{'{NO_URUT}'}</code> (Nomor Urut).</p>
                        </div>
                        
                        <h4 className="text-sm font-semibold text-gray-700">Konfigurasi Nomor Urut per Jenjang</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                    <tr><th className="px-4 py-2">Jenjang</th><th className="px-4 py-2">Mulai Dari</th><th className="px-4 py-2">Digit Padding</th></tr>
                                </thead>
                                <tbody>
                                    {localSettings.nisSettings.jenjangConfig.map(jc => {
                                        const jenjangName = localSettings.jenjang.find(j => j.id === jc.jenjangId)?.nama || 'Unknown';
                                        return (
                                            <tr key={jc.jenjangId} className="bg-white border-b">
                                                <td className="px-4 py-2 font-medium text-gray-900">{jenjangName}</td>
                                                <td className="px-4 py-2"><input type="number" value={jc.startNumber} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'startNumber', e.target.value)} className="w-20 p-1 border rounded text-center"/></td>
                                                <td className="px-4 py-2"><input type="number" value={jc.padding} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'padding', e.target.value)} className="w-20 p-1 border rounded text-center"/></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Sumber Tahun Masehi</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center"><input type="radio" name="masehiSource" value="auto" checked={localSettings.nisSettings.masehiYearSource === 'auto'} onChange={() => handleNisSettingChange('masehiYearSource', 'auto')} className="mr-2"/>Otomatis (Tgl Masuk)</label>
                                    <label className="flex items-center"><input type="radio" name="masehiSource" value="manual" checked={localSettings.nisSettings.masehiYearSource === 'manual'} onChange={() => handleNisSettingChange('masehiYearSource', 'manual')} className="mr-2"/>Manual</label>
                                </div>
                                {localSettings.nisSettings.masehiYearSource === 'manual' && <input type="number" value={localSettings.nisSettings.manualMasehiYear} onChange={(e) => handleNisSettingChange('manualMasehiYear', parseInt(e.target.value) || new Date().getFullYear())} className="mt-2 w-full border p-2 rounded"/>}
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Sumber Tahun Hijriah</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center"><input type="radio" name="hijriSource" value="auto" checked={localSettings.nisSettings.hijriahYearSource === 'auto'} onChange={() => handleNisSettingChange('hijriahYearSource', 'auto')} className="mr-2"/>Otomatis (Estimasi)</label>
                                    <label className="flex items-center"><input type="radio" name="hijriSource" value="manual" checked={localSettings.nisSettings.hijriahYearSource === 'manual'} onChange={() => handleNisSettingChange('hijriahYearSource', 'manual')} className="mr-2"/>Manual</label>
                                </div>
                                {localSettings.nisSettings.hijriahYearSource === 'manual' && <input type="number" value={localSettings.nisSettings.manualHijriahYear} onChange={(e) => handleNisSettingChange('manualHijriahYear', parseInt(e.target.value) || 1445)} className="mt-2 w-full border p-2 rounded"/>}
                            </div>
                        </div>
                    </div>
                )}

                {localSettings.nisSettings.generationMethod === 'global' && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Prefix Global</label>
                                <input type="text" value={localSettings.nisSettings.globalPrefix} onChange={(e) => handleNisSettingChange('globalPrefix', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" placeholder="Contoh: PS" />
                            </div>
                            <div className="flex items-center pt-6">
                                <input type="checkbox" checked={localSettings.nisSettings.globalUseYearPrefix} onChange={(e) => handleNisSettingChange('globalUseYearPrefix', e.target.checked)} className="w-4 h-4 text-teal-600 rounded"/>
                                <label className="ml-2 text-sm text-gray-700">Gunakan Tahun Masuk sebagai Prefix (YYYY)</label>
                            </div>
                            <div className="flex items-center pt-6">
                                <input type="checkbox" checked={localSettings.nisSettings.globalUseJenjangCode} onChange={(e) => handleNisSettingChange('globalUseJenjangCode', e.target.checked)} className="w-4 h-4 text-teal-600 rounded"/>
                                <label className="ml-2 text-sm text-gray-700">Sisipkan Kode Jenjang</label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Mulai Nomor Urut</label>
                                <input type="number" value={localSettings.nisSettings.globalStartNumber} onChange={(e) => handleNisSettingChange('globalStartNumber', parseInt(e.target.value) || 1)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Digit Padding</label>
                                <input type="number" value={localSettings.nisSettings.globalPadding} onChange={(e) => handleNisSettingChange('globalPadding', parseInt(e.target.value) || 4)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" />
                            </div>
                        </div>
                    </div>
                )}

                {localSettings.nisSettings.generationMethod === 'dob' && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Format Tanggal</label>
                                <select value={localSettings.nisSettings.dobFormat} onChange={(e) => handleNisSettingChange('dobFormat', e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5">
                                    <option value="YYYYMMDD">YYYYMMDD (20100101)</option>
                                    <option value="DDMMYY">DDMMYY (010110)</option>
                                    <option value="YYMMDD">YYMMDD (100101)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Pemisah (Separator)</label>
                                <input type="text" value={localSettings.nisSettings.dobSeparator} onChange={(e) => handleNisSettingChange('dobSeparator', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" placeholder="Kosongkan jika tidak ada" />
                            </div>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" checked={localSettings.nisSettings.dobUseJenjangCode} onChange={(e) => handleNisSettingChange('dobUseJenjangCode', e.target.checked)} className="w-4 h-4 text-teal-600 rounded"/>
                            <label className="ml-2 text-sm text-gray-700">Sisipkan Kode Jenjang setelah Tanggal</label>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Digit Padding (Nomor Urut)</label>
                            <input type="number" value={localSettings.nisSettings.dobPadding} onChange={(e) => handleNisSettingChange('dobPadding', parseInt(e.target.value) || 3)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 md:w-1/2" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
