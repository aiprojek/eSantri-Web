
import React, { useState, useMemo } from 'react';
import { Buku, Santri } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { KartuPerpusTemplate } from './print/KartuPerpusTemplate';
import { SlipBukuTemplate } from './print/SlipBukuTemplate';
import { LabelBukuTemplate } from './print/LabelBukuTemplate';
import { printToPdfNative } from '../../utils/pdfGenerator';

interface CetakPerpusProps {
    bukuList: Buku[];
}

export const CetakPerpus: React.FC<CetakPerpusProps> = ({ bukuList }) => {
    const { santriList } = useSantriContext();
    const { settings } = useAppContext();
    const [activeTab, setActiveTab] = useState<'kartu' | 'slip' | 'label'>('kartu');
    
    // Page Config State
    const [margin, setMargin] = useState({ top: 1.0, right: 1.0, bottom: 1.0, left: 1.0 });
    const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Legal'>('A4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    
    // Custom Dimensions State
    const [slipSize, setSlipSize] = useState({ w: 7.5, h: 12.0 });
    const [labelSize, setLabelSize] = useState({ w: 3.0, h: 4.0 });

    // Kartu Anggota State
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
    const [cardTheme, setCardTheme] = useState<'classic' | 'modern' | 'bold' | 'dark' | 'ceria' | 'vertical'>('classic');
    const [filterJenjang, setFilterJenjang] = useState('');
    
    // Slip & Label Buku State
    const [selectedBukuIds, setSelectedBukuIds] = useState<number[]>([]);
    const [filterKategori, setFilterKategori] = useState('');

    // --- LOGIC KARTU ---
    const filteredSantri = useMemo(() => {
        return santriList.filter(s => s.status === 'Aktif' && (!filterJenjang || s.jenjangId === parseInt(filterJenjang)));
    }, [santriList, filterJenjang]);

    const handleSelectSantri = (id: number) => {
        setSelectedSantriIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleSelectAllSantri = () => {
        if (selectedSantriIds.length === filteredSantri.length) setSelectedSantriIds([]);
        else setSelectedSantriIds(filteredSantri.map(s => s.id));
    };

    // --- LOGIC BUKU ---
    const filteredBuku = useMemo(() => {
        return bukuList.filter(b => !filterKategori || b.kategori === filterKategori);
    }, [bukuList, filterKategori]);

    const handleSelectBuku = (id: number) => {
        setSelectedBukuIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleSelectAllBuku = () => {
        if (selectedBukuIds.length === filteredBuku.length) setSelectedBukuIds([]);
        else setSelectedBukuIds(filteredBuku.map(b => b.id));
    };

    // --- PAPER LOGIC ---
    const getPaperDimensions = () => {
        const sizes = {
            'A4': { w: 21.0, h: 29.7 },
            'F4': { w: 21.5, h: 33.0 },
            'Legal': { w: 21.6, h: 35.6 }
        };
        const dim = sizes[paperSize];
        return orientation === 'portrait' ? dim : { w: dim.h, h: dim.w };
    };

    const currentPaper = getPaperDimensions();

    const handlePrint = (elementId: string, filename: string) => {
        // Inject style for print margin & size dynamically
        const styleId = 'dynamic-print-margin';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        
        // CSS @page rule to force browser print settings
        styleEl.innerHTML = `
            @page { 
                size: ${paperSize} ${orientation}; 
                margin: 0; 
            }
            body { -webkit-print-color-adjust: exact; }
        `; 
        
        printToPdfNative(elementId, filename);
    };

    return (
        <div className="bg-gray-100 rounded-lg p-6 min-h-[600px] flex flex-col lg:flex-row gap-6">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-1/3 bg-white p-4 rounded-lg shadow-sm h-fit space-y-6">
                <div className="flex border-b mb-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('kartu')} className={`flex-1 py-2 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'kartu' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}>Kartu</button>
                    <button onClick={() => setActiveTab('slip')} className={`flex-1 py-2 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'slip' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}>Slip Buku</button>
                    <button onClick={() => setActiveTab('label')} className={`flex-1 py-2 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'label' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}>Label</button>
                </div>

                {/* PAGE & MARGIN CONFIGURATION */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                     <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2"><i className="bi bi-printer"></i> Konfigurasi Kertas</h4>
                     
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Ukuran Kertas</label>
                            <select value={paperSize} onChange={e => setPaperSize(e.target.value as any)} className="w-full border rounded p-1 text-xs">
                                <option value="A4">A4</option>
                                <option value="F4">F4 (Folio)</option>
                                <option value="Legal">Legal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Orientasi</label>
                            <select value={orientation} onChange={e => setOrientation(e.target.value as any)} className="w-full border rounded p-1 text-xs">
                                <option value="portrait">Portrait (Tegak)</option>
                                <option value="landscape">Landscape (Miring)</option>
                            </select>
                        </div>
                     </div>

                     <div className="border-t border-gray-200 pt-2">
                         <label className="block text-[10px] font-bold text-gray-500 mb-2">Margin Halaman (cm)</label>
                         <div className="grid grid-cols-4 gap-1">
                             {['top', 'bottom', 'left', 'right'].map(pos => (
                                 <div key={pos}>
                                     <label className="block text-[9px] text-gray-400 capitalize text-center">{pos}</label>
                                     <input type="number" step="0.1" value={(margin as any)[pos]} onChange={e => setMargin({...margin, [pos]: Number(e.target.value)})} className="w-full border rounded p-1 text-xs text-center" />
                                 </div>
                             ))}
                         </div>
                     </div>
                </div>

                {/* ITEM SIZE CONFIGURATION (Context Sensitive) */}
                {activeTab === 'slip' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Ukuran Slip (cm)</h4>
                        <div className="grid grid-cols-2 gap-2">
                             <div><label className="block text-[10px] text-blue-600">Lebar (W)</label><input type="number" step="0.1" value={slipSize.w} onChange={e => setSlipSize({...slipSize, w: Number(e.target.value)})} className="w-full border rounded p-1 text-xs text-center" /></div>
                             <div><label className="block text-[10px] text-blue-600">Tinggi (H)</label><input type="number" step="0.1" value={slipSize.h} onChange={e => setSlipSize({...slipSize, h: Number(e.target.value)})} className="w-full border rounded p-1 text-xs text-center" /></div>
                        </div>
                    </div>
                )}
                {activeTab === 'label' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="text-xs font-bold text-green-700 uppercase mb-2">Ukuran Label (cm)</h4>
                        <div className="grid grid-cols-2 gap-2">
                             <div><label className="block text-[10px] text-green-600">Lebar (W)</label><input type="number" step="0.1" value={labelSize.w} onChange={e => setLabelSize({...labelSize, w: Number(e.target.value)})} className="w-full border rounded p-1 text-xs text-center" /></div>
                             <div><label className="block text-[10px] text-green-600">Tinggi (H)</label><input type="number" step="0.1" value={labelSize.h} onChange={e => setLabelSize({...labelSize, h: Number(e.target.value)})} className="w-full border rounded p-1 text-xs text-center" /></div>
                        </div>
                    </div>
                )}

                {/* TAB SPECIFIC CONTENT */}
                {activeTab === 'kartu' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tema Kartu</label>
                            <select value={cardTheme} onChange={e => setCardTheme(e.target.value as any)} className="w-full border rounded p-2 text-sm">
                                <option value="classic">Classic (Emas/Hijau)</option>
                                <option value="modern">Modern Tech (Biru)</option>
                                <option value="bold">Bold B&W (Hitam Putih)</option>
                                <option value="dark">Premium Dark (Gelap)</option>
                                <option value="ceria">Ceria (Warna-warni)</option>
                                <option value="vertical">Vertical ID (Merah)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filter Jenjang</label>
                            <select value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)} className="w-full border rounded p-2 text-sm">
                                <option value="">Semua Jenjang</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div className="border rounded max-h-60 overflow-y-auto p-2 bg-gray-50">
                            <div className="flex justify-between mb-2 text-xs">
                                <span className="font-bold">Pilih Santri</span>
                                <button onClick={handleSelectAllSantri} className="text-blue-600">All</button>
                            </div>
                            {filteredSantri.map(s => (
                                <div key={s.id} className="flex items-center gap-2 mb-1">
                                    <input type="checkbox" checked={selectedSantriIds.includes(s.id)} onChange={() => handleSelectSantri(s.id)} />
                                    <span className="text-xs truncate">{s.namaLengkap}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => handlePrint('preview-kartu', 'Kartu_Anggota_Perpus')} disabled={selectedSantriIds.length === 0} className="w-full bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700 disabled:bg-gray-300">Cetak Kartu</button>
                    </div>
                )}

                {(activeTab === 'slip' || activeTab === 'label') && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filter Kategori</label>
                            <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="w-full border rounded p-2 text-sm">
                                <option value="">Semua Kategori</option>
                                <option value="Kitab Kuning">Kitab Kuning</option>
                                <option value="Buku Pelajaran">Buku Pelajaran</option>
                                <option value="Umum">Umum</option>
                                <option value="Referensi">Referensi</option>
                            </select>
                        </div>
                         <div className="border rounded max-h-60 overflow-y-auto p-2 bg-gray-50">
                            <div className="flex justify-between mb-2 text-xs">
                                <span className="font-bold">Pilih Buku</span>
                                <button onClick={handleSelectAllBuku} className="text-blue-600">All</button>
                            </div>
                            {filteredBuku.map(b => (
                                <div key={b.id} className="flex items-center gap-2 mb-1">
                                    <input type="checkbox" checked={selectedBukuIds.includes(b.id)} onChange={() => handleSelectBuku(b.id)} />
                                    <span className="text-xs truncate" title={b.judul}>{b.judul}</span>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => handlePrint(activeTab === 'slip' ? 'preview-slip' : 'preview-label', activeTab === 'slip' ? 'Slip_Buku' : 'Label_Buku')} 
                            disabled={selectedBukuIds.length === 0} 
                            className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:bg-gray-300"
                        >
                            {activeTab === 'slip' ? 'Cetak Slip' : 'Cetak Label'}
                        </button>
                    </div>
                )}
            </div>

            {/* Preview Area */}
            <div className="w-full lg:w-2/3 bg-gray-300 overflow-auto p-8 flex justify-center rounded-lg shadow-inner">
                {activeTab === 'kartu' && selectedSantriIds.length > 0 && (
                    <div 
                        id="preview-kartu" 
                        className="bg-white shadow-xl printable-content-wrapper" 
                        style={{ 
                            width: `${currentPaper.w}cm`, 
                            minHeight: `${currentPaper.h}cm`, 
                            paddingTop: `${margin.top}cm`,
                            paddingRight: `${margin.right}cm`,
                            paddingBottom: `${margin.bottom}cm`,
                            paddingLeft: `${margin.left}cm`
                        }}
                    >
                        <div className="flex flex-wrap gap-2 justify-center content-start">
                            {filteredSantri.filter(s => selectedSantriIds.includes(s.id)).map(santri => (
                                <div key={santri.id} className="break-inside-avoid mb-2" style={{ pageBreakInside: 'avoid' }}>
                                    <KartuPerpusTemplate santri={santri} settings={settings} theme={cardTheme as any} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'slip' && selectedBukuIds.length > 0 && (
                    <div 
                        id="preview-slip" 
                        className="bg-white shadow-xl printable-content-wrapper" 
                        style={{ 
                            width: `${currentPaper.w}cm`, 
                            minHeight: `${currentPaper.h}cm`, 
                            paddingTop: `${margin.top}cm`,
                            paddingRight: `${margin.right}cm`,
                            paddingBottom: `${margin.bottom}cm`,
                            paddingLeft: `${margin.left}cm`
                        }}
                    >
                         <div className="flex flex-wrap gap-4 justify-start content-start">
                            {filteredBuku.filter(b => selectedBukuIds.includes(b.id)).map(buku => (
                                <div key={buku.id} className="break-inside-avoid mb-2" style={{ pageBreakInside: 'avoid' }}>
                                    <SlipBukuTemplate buku={buku} settings={settings} width={slipSize.w} height={slipSize.h} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'label' && selectedBukuIds.length > 0 && (
                    <div 
                        id="preview-label" 
                        className="bg-white shadow-xl printable-content-wrapper" 
                        style={{ 
                            width: `${currentPaper.w}cm`, 
                            minHeight: `${currentPaper.h}cm`, 
                            paddingTop: `${margin.top}cm`,
                            paddingRight: `${margin.right}cm`,
                            paddingBottom: `${margin.bottom}cm`,
                            paddingLeft: `${margin.left}cm`
                        }}
                    >
                         <div className="flex flex-wrap gap-1 justify-start content-start">
                            {filteredBuku.filter(b => selectedBukuIds.includes(b.id)).map(buku => (
                                <div key={buku.id} className="break-inside-avoid mb-1" style={{ pageBreakInside: 'avoid' }}>
                                    <LabelBukuTemplate buku={buku} settings={settings} width={labelSize.w} height={labelSize.h} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {((activeTab === 'kartu' && selectedSantriIds.length === 0) || ((activeTab === 'slip' || activeTab === 'label') && selectedBukuIds.length === 0)) && (
                    <div className="text-gray-500 mt-20 font-bold opacity-50">Pilih data untuk melihat preview</div>
                )}
            </div>
        </div>
    );
};
