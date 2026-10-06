import React, { useState } from 'react';
import { Inventaris, PondokSettings } from '../../types';
import { printExportFacade } from '../../utils/printExportFacade';
import { buildStandardExportFileName } from '../../utils/exportFileName';

interface SarprasLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: Inventaris[];
    settings: PondokSettings;
}

const renderPseudoBarcode = (code: string) => {
    const clean = (code || 'INV001').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const bars: number[] = [];
    for (let i = 0; i < clean.length; i++) {
        const charCode = clean.charCodeAt(i);
        bars.push((charCode % 3) + 1);
        bars.push(((charCode >> 2) % 2) + 1);
        bars.push(((charCode >> 4) % 3) + 1);
    }
    return (
        <div className="flex items-center justify-center gap-[1.5px] h-7 w-full overflow-hidden my-1">
            <div className="h-full bg-black w-[2px]"></div>
            <div className="h-full bg-black w-[1px]"></div>
            {bars.slice(0, 32).map((w, idx) => (
                <div
                    key={idx}
                    className="h-full bg-black"
                    style={{ width: `${w}px`, marginRight: idx % 2 === 0 ? '1px' : '2px' }}
                />
            ))}
            <div className="h-full bg-black w-[1px]"></div>
            <div className="h-full bg-black w-[2px]"></div>
        </div>
    );
};

export const SarprasLabelModal: React.FC<SarprasLabelModalProps> = ({
    isOpen,
    onClose,
    assets,
    settings
}) => {
    const [selectedIds, setSelectedIds] = useState<number[]>(() => assets.map(a => a.id));
    const [columns, setColumns] = useState<2 | 3>(3);
    const [multiplyByQty, setMultiplyByQty] = useState<boolean>(false);
    const [isPrinting, setIsPrinting] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setSelectedIds(assets.map(a => a.id));
        }
    }, [isOpen, assets]);

    if (!isOpen) return null;

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedIds.length === assets.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(assets.map(a => a.id));
        }
    };

    const selectedAssets = assets.filter(a => selectedIds.includes(a.id));

    // Expand if multiplyByQty is enabled (capped at 20 per item to avoid accidental browser freeze)
    const labelsToPrint: { asset: Inventaris; unitIdx: number; totalUnits: number }[] = [];
    selectedAssets.forEach(asset => {
        const count = multiplyByQty && asset.jenis === 'Bergerak' ? Math.min(Math.max(1, asset.jumlah || 1), 20) : 1;
        for (let i = 1; i <= count; i++) {
            labelsToPrint.push({ asset, unitIdx: i, totalUnits: count });
        }
    });

    const handlePrint = async () => {
        if (labelsToPrint.length === 0 || isPrinting) return;
        setIsPrinting(true);
        try {
            const fileName = buildStandardExportFileName('label-inventaris-sarpras', [String(labelsToPrint.length)]);
            await printExportFacade.printDialog({
                elementId: 'sarpras-label-print-area',
                fileName,
                paperSize: 'A4',
                target: 'sarpras'
            });
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <i className="bi bi-upc-scan text-teal-400"></i>
                            Cetak Stiker Label Inventaris (Asset Tag)
                        </h3>
                        <p className="text-xs text-slate-300">
                            Pilih aset dan ukuran stiker untuk dicetak pada kertas label stiker A4.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            {selectedIds.length === assets.length ? 'Batal Pilih Semua' : `Pilih Semua (${assets.length})`}
                        </button>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setColumns(3)}
                                className={`px-2.5 py-1 rounded font-bold ${columns === 3 ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                3 Kolom (Kecil/Standar)
                            </button>
                            <button
                                type="button"
                                onClick={() => setColumns(2)}
                                className={`px-2.5 py-1 rounded font-bold ${columns === 2 ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                2 Kolom (Besar)
                            </button>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-300">
                            <input
                                type="checkbox"
                                checked={multiplyByQty}
                                onChange={e => setMultiplyByQty(e.target.checked)}
                                className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            Cetak sesuai jumlah unit (Maks. 20/aset)
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">
                            Total Stiker: <span className="text-teal-700">{labelsToPrint.length}</span>
                        </span>
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={labelsToPrint.length === 0 || isPrinting}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold rounded-lg shadow-xs flex items-center gap-2"
                        >
                            <i className="bi bi-printer-fill"></i>
                            {isPrinting ? 'Menyiapkan...' : 'Cetak Stiker Sekarang'}
                        </button>
                    </div>
                </div>

                {/* Body: Left Selection + Right Preview */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x">
                    {/* Selection List */}
                    <div className="p-4 overflow-y-auto max-h-60 lg:max-h-none bg-white space-y-1.5">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2">Daftar Aset ({selectedIds.length} dipilih)</div>
                        {assets.map(asset => (
                            <label
                                key={asset.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                    selectedIds.includes(asset.id)
                                        ? 'bg-teal-50/70 border-teal-300 text-teal-950'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(asset.id)}
                                    onChange={() => toggleSelect(asset.id)}
                                    className="mt-0.5 rounded text-teal-600"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold truncate">{asset.nama}</div>
                                    <div className="text-[10px] font-mono text-slate-500">{asset.kode} • {asset.lokasi || '-'}</div>
                                </div>
                                <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                    {asset.jenis === 'Bergerak' ? `${asset.jumlah} ${asset.satuan || 'Unit'}` : `${asset.luas || 0} m²`}
                                </span>
                            </label>
                        ))}
                    </div>

                    {/* Live Sticker Preview */}
                    <div className="lg:col-span-2 p-6 overflow-y-auto bg-slate-100">
                        <div
                            id="sarpras-label-print-area"
                            className="bg-white p-5 shadow-sm mx-auto rounded border border-slate-200"
                            style={{ width: '100%', maxWidth: '21cm' }}
                        >
                            <div className={`grid gap-3 ${columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                                {labelsToPrint.map(({ asset, unitIdx, totalUnits }, idx) => (
                                    <div
                                        key={`${asset.id}-${idx}`}
                                        className="border-2 border-black rounded p-2.5 bg-white text-black flex flex-col justify-between break-inside-avoid"
                                    >
                                        <div className="border-b border-black pb-1 flex items-center justify-between gap-1">
                                            <div className="min-w-0">
                                                <div className="text-[9px] font-black uppercase tracking-tight truncate">
                                                    {settings.namaPonpes || 'PONDOK PESANTREN'}
                                                </div>
                                                <div className="text-[8px] font-semibold uppercase text-gray-700">
                                                    INVENTARIS SARANA &amp; PRASARANA
                                                </div>
                                            </div>
                                            <span className="px-1.5 py-0.5 border border-black text-[8px] font-black uppercase shrink-0">
                                                {asset.sumber === 'Wakaf' ? 'WAKAF' : 'INVENTARIS'}
                                            </span>
                                        </div>

                                        <div className="my-1 text-center">
                                            {renderPseudoBarcode(asset.kode)}
                                            <div className="font-mono text-[10px] font-black tracking-widest">
                                                {asset.kode}{totalUnits > 1 ? ` #${unitIdx}/${totalUnits}` : ''}
                                            </div>
                                        </div>

                                        <div className="border-t border-black pt-1 text-[9px] space-y-0.5">
                                            <div className="font-bold truncate text-[10px]">{asset.nama}</div>
                                            {asset.merkSpesifikasi && (
                                                <div className="text-[8px] text-gray-700 truncate">Spek: {asset.merkSpesifikasi}</div>
                                            )}
                                            <div className="flex justify-between text-[8px] font-semibold">
                                                <span className="truncate">Lokasi: {asset.lokasi || '-'}</span>
                                                <span className="shrink-0">Thn: {asset.tanggalPerolehan?.slice(0, 4) || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {labelsToPrint.length === 0 && (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    Pilih minimal 1 aset di panel kiri untuk menampilkan pratinjau stiker.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
