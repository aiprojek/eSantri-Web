
import React, { useState } from 'react';
import { PondokSettings, PsbDesignStyle } from '../../types';
import { useAppContext } from '../../AppContext';
import { generatePosterPrompt } from '../../services/aiService';

interface PsbPosterMakerProps {
    settings: PondokSettings;
}

export const PsbPosterMaker: React.FC<PsbPosterMakerProps> = ({ settings }) => {
    const { showToast } = useAppContext();
    const [style, setStyle] = useState<PsbDesignStyle>('modern');
    const [ratio, setRatio] = useState<string>('9:16');
    const [details, setDetails] = useState<string>('');
    const [customInfo, setCustomInfo] = useState<string>('');
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const infoString = customInfo.trim() || `Nama Pondok: ${settings.namaPonpes}`;
            const prompt = await generatePosterPrompt(style, ratio, details, infoString);
            setGeneratedPrompt(prompt);
            showToast("Prompt berhasil dibuat! Silakan salin.", "success");
        } catch (error) {
            showToast("Gagal membuat prompt. Pastikan koneksi internet lancar.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedPrompt) return;
        navigator.clipboard.writeText(generatedPrompt);
        showToast("Prompt disalin ke clipboard!", "success");
    };

    const ratioOptions = [
        { val: '9:16', label: 'Story/TikTok', icon: 'bi-phone' },
        { val: '1:1', label: 'Square/IG', icon: 'bi-square' },
        { val: '16:9', label: 'Landscape', icon: 'bi-display' },
        { val: 'A4 Portrait', label: 'Cetak A4', icon: 'bi-file-earmark' },
        { val: 'A3 Portrait', label: 'Cetak A3', icon: 'bi-file-earmark-text' },
        { val: 'F4/Folio Portrait', label: 'Cetak F4', icon: 'bi-file-earmark-richtext' }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            <div className="bg-white p-6 rounded-lg shadow-md overflow-y-auto">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <i className="bi bi-stars text-xl"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Poster Prompt Maker</h2>
                        <p className="text-xs text-gray-500">Buat prompt untuk AI Image Generator (Midjourney/DALL-E) secara Gratis.</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gaya Desain Poster</label>
                        <select 
                            value={style} 
                            onChange={(e) => setStyle(e.target.value as PsbDesignStyle)} 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="classic">Klasik Tradisional (Islami & Elegan)</option>
                            <option value="modern">Modern Tech (Minimalis & Bersih)</option>
                            <option value="bold">Bold (Tegas & Kontras Tinggi)</option>
                            <option value="dark">Premium Dark (Eksklusif & Sinematik)</option>
                            <option value="ceria">Ceria (Warna-warni untuk TPQ/Anak)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rasio Ukuran</label>
                        <div className="grid grid-cols-3 gap-3">
                            {ratioOptions.map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => setRatio(opt.val)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${ratio === opt.val ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <i className={`bi ${opt.icon} text-lg mb-1`}></i>
                                    <span className="text-xs font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Informasi Utama (Teks pada Poster)</label>
                        <textarea 
                            value={customInfo}
                            onChange={(e) => setCustomInfo(e.target.value)}
                            rows={3}
                            placeholder="Contoh: Penerimaan Santri Baru 2025/2026, Pondok Pesantren Al-Hikmah. Program Unggulan: Tahfidz & Bahasa Arab. Segera Daftar, Kuota Terbatas!"
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-purple-500 focus:border-purple-500 bg-purple-50/20"
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1">Tuliskan teks apa saja yang ingin ditampilkan dalam desain.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Detail Visual (Opsional)</label>
                        <textarea 
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={2}
                            placeholder="Contoh: Suasana santri sedang mengaji di taman, latar belakang masjid megah, cahaya matahari sore yang hangat..."
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-purple-500 focus:border-purple-500"
                        ></textarea>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
                    >
                        {isLoading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : <i className="bi bi-magic"></i>}
                        Generate Prompt
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col h-full text-white relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                    <i className="bi bi-terminal"></i> Hasil Prompt
                </h3>
                
                <div className="flex-grow bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 border border-gray-700 relative overflow-y-auto custom-scrollbar">
                    {generatedPrompt ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{generatedPrompt}</p>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                            <i className="bi bi-image text-4xl mb-2"></i>
                            <p>Prompt akan muncul di sini...</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end gap-3 relative z-10">
                    <button 
                        onClick={() => setGeneratedPrompt('')}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        disabled={!generatedPrompt}
                    >
                        Reset
                    </button>
                    <button 
                        onClick={copyToClipboard}
                        disabled={!generatedPrompt}
                        className="px-6 py-2 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:bg-gray-600 disabled:text-gray-400"
                    >
                        <i className="bi bi-clipboard"></i> Salin Prompt
                    </button>
                </div>
                
                <div className="mt-4 p-3 bg-gray-700/50 rounded text-xs text-gray-400 border border-gray-600">
                    <p><i className="bi bi-info-circle mr-1"></i> Tips: Salin prompt ini dan tempelkan ke <strong>Midjourney</strong> (/imagine), <strong>Bing Image Creator</strong> (DALL-E 3), atau <strong>Stable Diffusion</strong> untuk membuat gambar.</p>
                </div>
            </div>
        </div>
    );
};
