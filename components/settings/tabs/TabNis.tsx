
import React, { useState } from 'react';
import { PondokSettings, NisSettings, NisJenjangConfig } from '../../../types';
import { useSantriContext } from '../../../contexts/SantriContext';
import { detectNisSettings } from '../../../utils/nisDetector';

interface TabNisProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
}

export const TabNis: React.FC<TabNisProps> = ({ localSettings, setLocalSettings }) => {
    const { santriList } = useSantriContext();
    const [isDetecting, setIsDetecting] = useState(false);

    const handleNisSettingChange = <K extends keyof NisSettings>(key: K, value: NisSettings[K]) => {
        setLocalSettings(prev => ({
            ...prev,
            nisSettings: {
                ...prev.nisSettings,
                [key]: value,
            },
        }));
    };

    const handleNisJenjangConfigChange = (jenjangId: number, key: keyof NisJenjangConfig, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            nisSettings: {
                ...prev.nisSettings,
                jenjangConfig: prev.nisSettings.jenjangConfig.map(jc => 
                    jc.jenjangId === jenjangId ? { ...jc, [key]: value } : jc
                )
            }
        }));
    };

    const handleAutoDetect = () => {
        setIsDetecting(true);
        setTimeout(() => {
            const suggested = detectNisSettings(santriList, localSettings.jenjang, localSettings.nisSettings);
            if (Object.keys(suggested).length > 0) {
                setLocalSettings(prev => ({
                    ...prev,
                    nisSettings: {
                        ...prev.nisSettings,
                        ...suggested
                    }
                }));
            }
            setIsDetecting(false);
        }, 800);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 border-b pb-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-gray-700">Pengaturan Generator NIS</h2>
                    <p className="text-xs text-gray-500">Atur format penomoran otomatis untuk santri baru.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={handleAutoDetect}
                        disabled={isDetecting || santriList.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Deteksi otomatis dari data santri yang sudah ada"
                    >
                        {isDetecting ? (
                            <><i className="bi bi-arrow-repeat animate-spin"></i> Mendeteksi...</>
                        ) : (
                            <><i className="bi bi-magic"></i> Deteksi Otomatis</>
                        )}
                    </button>
                    <div className="flex items-center bg-gray-50 p-2 rounded-lg border border-gray-100 sm:bg-transparent sm:p-0 sm:border-0">
                        <label className="inline-flex items-center cursor-pointer w-full sm:w-auto">
                            <input 
                                type="checkbox" 
                                checked={localSettings.nisSettings.useIndependentSettings || false} 
                                onChange={(e) => handleNisSettingChange('useIndependentSettings', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="relative min-w-[44px] w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900 leading-tight">
                                Mode Mandiri
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {!localSettings.nisSettings.useIndependentSettings ? (
                    <>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Metode Pembuatan NIS (Global)</label>
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
                                            <tr><th className="px-4 py-2">Jenjang</th><th className="px-4 py-2 text-center">Mulai Dari</th><th className="px-4 py-2 text-center">Digit Padding</th></tr>
                                        </thead>
                                        <tbody>
                                            {localSettings.nisSettings.jenjangConfig.map(jc => {
                                                const jenjangName = localSettings.jenjang.find(j => j.id === jc.jenjangId)?.nama || 'Unknown';
                                                return (
                                                    <tr key={jc.jenjangId} className="bg-white border-b">
                                                        <td className="px-4 py-2 font-medium text-gray-900">{jenjangName}</td>
                                                        <td className="px-4 py-2 text-center"><input type="number" value={jc.startNumber} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'startNumber', parseInt(e.target.value) || 0)} className="w-20 p-1 border rounded text-center"/></td>
                                                        <td className="px-4 py-2 text-center"><input type="number" value={jc.padding} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'padding', parseInt(e.target.value) || 0)} className="w-20 p-1 border rounded text-center"/></td>
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
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <p className="text-sm text-blue-800 italic">
                                <strong>Mode Mandiri Aktif:</strong> Setiap Marhalah dapat memiliki metode dan format NIS yang berbeda.
                            </p>
                        </div>

                        {/* Desktop View Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 border-collapse">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 border">Marhalah</th>
                                        <th className="px-4 py-3 border">Metode</th>
                                        <th className="px-4 py-3 border">Detail Konfigurasi</th>
                                        <th className="px-4 py-3 border text-center">Urutan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localSettings.nisSettings.jenjangConfig.map(jc => {
                                        const jenjangName = localSettings.jenjang.find(j => j.id === jc.jenjangId)?.nama || 'Unknown';
                                        return (
                                            <tr key={jc.jenjangId} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 border font-bold text-gray-900">{jenjangName}</td>
                                                <td className="px-4 py-3 border">
                                                    <select 
                                                        value={jc.method || 'global'} 
                                                        onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'method', e.target.value)}
                                                        className="w-full p-1.5 border rounded text-xs"
                                                    >
                                                        <option value="global">Global (Prefix)</option>
                                                        <option value="custom">Kustom (Format)</option>
                                                        <option value="dob">Tgl Lahir</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 border space-y-2 min-w-[250px]">
                                                    {jc.method === 'custom' && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Format</label>
                                                            <input 
                                                                type="text" 
                                                                value={jc.format || ''} 
                                                                onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'format', e.target.value)}
                                                                className="w-full p-1 border rounded text-xs"
                                                                placeholder="{TM}{KODE}{NO_URUT}"
                                                            />
                                                        </div>
                                                    )}
                                                    {jc.method === 'global' && (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Prefix</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={jc.prefix || ''} 
                                                                    onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'prefix', e.target.value)}
                                                                    className="w-full p-1 border rounded text-xs"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <label className="flex items-center text-[10px] text-gray-600">
                                                                    <input type="checkbox" checked={jc.useYearPrefix} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'useYearPrefix', e.target.checked)} className="mr-1 w-3 h-3"/> Pakai Thn
                                                                </label>
                                                                <label className="flex items-center text-[10px] text-gray-600">
                                                                    <input type="checkbox" checked={jc.useJenjangCode} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'useJenjangCode', e.target.checked)} className="mr-1 w-3 h-3"/> Pakai Kode
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {jc.method === 'dob' && (
                                                        <p className="text-[10px] text-gray-500 italic">Mengikuti format tanggal lahir santri.</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 border">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        <div className="flex flex-col">
                                                            <label className="text-[9px] text-gray-400 uppercase text-center">Mulai</label>
                                                            <input type="number" value={jc.startNumber} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'startNumber', parseInt(e.target.value) || 1)} className="w-16 p-1 border rounded text-center text-xs"/>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[9px] text-gray-400 uppercase text-center">Digit</label>
                                                            <input type="number" value={jc.padding} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'padding', parseInt(e.target.value) || 3)} className="w-16 p-1 border rounded text-center text-xs"/>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View Cards */}
                        <div className="md:hidden space-y-4">
                            {localSettings.nisSettings.jenjangConfig.map(jc => {
                                const jenjangName = localSettings.jenjang.find(j => j.id === jc.jenjangId)?.nama || 'Unknown';
                                return (
                                    <div key={jc.jenjangId} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="font-bold text-gray-800">{jenjangName}</span>
                                            <select 
                                                value={jc.method || 'global'} 
                                                onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'method', e.target.value)}
                                                className="p-1.5 border rounded text-xs bg-white"
                                            >
                                                <option value="global">Global</option>
                                                <option value="custom">Kustom</option>
                                                <option value="dob">Tgl Lahir</option>
                                            </select>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                {jc.method === 'custom' && (
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Format NIS</label>
                                                        <input 
                                                            type="text" 
                                                            value={jc.format || ''} 
                                                            onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'format', e.target.value)}
                                                            className="w-full p-2 border rounded text-sm bg-white"
                                                            placeholder="{TM}{KODE}{NO_URUT}"
                                                        />
                                                    </div>
                                                )}
                                                {jc.method === 'global' && (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Prefix</label>
                                                            <input 
                                                                type="text" 
                                                                value={jc.prefix || ''} 
                                                                onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'prefix', e.target.value)}
                                                                className="w-full p-2 border rounded text-sm bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center text-xs text-gray-600">
                                                                <input type="checkbox" checked={jc.useYearPrefix} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'useYearPrefix', e.target.checked)} className="mr-2 w-4 h-4 text-teal-600"/> Pakai Thn
                                                            </label>
                                                            <label className="flex items-center text-xs text-gray-600">
                                                                <input type="checkbox" checked={jc.useJenjangCode} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'useJenjangCode', e.target.checked)} className="mr-2 w-4 h-4 text-teal-600"/> Pakai Kode
                                                                </label>
                                                        </div>
                                                    </div>
                                                )}
                                                {jc.method === 'dob' && (
                                                    <p className="text-xs text-gray-500 italic">Mengikuti format tanggal lahir santri.</p>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Mulai No</label>
                                                <input type="number" value={jc.startNumber} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'startNumber', parseInt(e.target.value) || 1)} className="w-full p-2 border rounded text-sm bg-white"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Digit (Padding)</label>
                                                <input type="number" value={jc.padding} onChange={(e) => handleNisJenjangConfigChange(jc.jenjangId, 'padding', parseInt(e.target.value) || 3)} className="w-full p-2 border rounded text-sm bg-white"/>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
