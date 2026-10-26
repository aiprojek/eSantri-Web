import React, { useState, useMemo, useEffect } from 'react';
import { PondokSettings, GridCell, MataPelajaran } from '../../../types';
import { generateSubjectKeyFromName } from '../../../utils/raporFormulaUtils';

interface RaporKurikulumGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PondokSettings;
    defaultJenjangId?: number;
    existingGrid: GridCell[][];
    activeRowIndex: number;
    onGenerateRows: (
        generatedRows: GridCell[][],
        insertMode: 'insert_below' | 'replace_sheet',
        colWidths: number[]
    ) => void;
}

export const RaporKurikulumGeneratorModal: React.FC<RaporKurikulumGeneratorModalProps> = ({
    isOpen,
    onClose,
    settings,
    defaultJenjangId,
    existingGrid,
    activeRowIndex,
    onGenerateRows
}) => {
    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(
        defaultJenjangId || settings.jenjang?.[0]?.id || 0
    );
    const [rumpunFilter, setRumpunFilter] = useState<string>('all');
    const [selectedMapelIds, setSelectedMapelIds] = useState<Set<number>>(new Set());

    // Opsi Kolom
    const [includeKkm, setIncludeKkm] = useState<boolean>(true);
    const [includeClassAvg, setIncludeClassAvg] = useState<boolean>(false);
    const [extraScoreFormat, setExtraScoreFormat] = useState<'none' | 'terbilang' | 'arab'>('terbilang');
    const [predikatMode, setPredikatMode] = useState<'none' | 'huruf' | 'pesantren'>('huruf');

    // Opsi Baris Rekap Bawah
    const [includeTotalRow, setIncludeTotalRow] = useState<boolean>(true);
    const [includeAvgRow, setIncludeAvgRow] = useState<boolean>(true);
    const [includeRankRow, setIncludeRankRow] = useState<boolean>(true);

    const [insertMode, setInsertMode] = useState<'insert_below' | 'replace_sheet'>('insert_below');

    useEffect(() => {
        if (isOpen) {
            const jId = defaultJenjangId || settings.jenjang?.[0]?.id || 0;
            setSelectedJenjangId(jId);
            setRumpunFilter('all');
        }
    }, [isOpen, defaultJenjangId, settings.jenjang]);

    const mapelForJenjang = useMemo(() => {
        const all = settings.mataPelajaran || [];
        return all.filter(m => {
            if (selectedJenjangId && m.jenjangId !== selectedJenjangId) return false;
            if (rumpunFilter !== 'all' && (m.rumpun || 'Umum') !== rumpunFilter) return false;
            return true;
        });
    }, [settings.mataPelajaran, selectedJenjangId, rumpunFilter]);

    useEffect(() => {
        setSelectedMapelIds(new Set(mapelForJenjang.map(m => m.id)));
    }, [mapelForJenjang]);

    if (!isOpen) return null;

    const toggleMapel = (id: number) => {
        setSelectedMapelIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBuildAndApply = () => {
        const chosenMapels: MataPelajaran[] = mapelForJenjang.filter(m => selectedMapelIds.has(m.id));
        if (chosenMapels.length === 0) return;

        // Kumpulkan key yang sudah dipakai di grid bila mode sisip
        const usedKeys = new Set<string>();
        if (insertMode === 'insert_below') {
            existingGrid.forEach(row =>
                row.forEach(c => {
                    if (c.key) usedKeys.add(c.key.toUpperCase());
                })
            );
        }

        // Susun definisi kolom aktif
        interface ColDef {
            id: string;
            header: string;
            width: number;
            align: 'left' | 'center' | 'right';
        }

        const cols: ColDef[] = [
            { id: 'no', header: 'NO', width: 38, align: 'center' },
            { id: 'mapel', header: 'MATA PELAJARAN', width: 220, align: 'left' }
        ];
        if (includeKkm) {
            cols.push({ id: 'kkm', header: 'KKM', width: 52, align: 'center' });
        }
        cols.push({ id: 'nilai', header: 'NILAI ANGKA', width: 78, align: 'center' });

        if (includeClassAvg) {
            cols.push({ id: 'rerata_kelas', header: 'RERATA KELAS', width: 74, align: 'center' });
        }

        if (extraScoreFormat === 'terbilang') {
            cols.push({ id: 'extra', header: 'TERBILANG / HURUF', width: 165, align: 'left' });
        } else if (extraScoreFormat === 'arab') {
            cols.push({ id: 'extra', header: 'ANGKA ARAB', width: 78, align: 'center' });
        }

        if (predikatMode !== 'none') {
            cols.push({ id: 'predikat', header: 'PREDIKAT', width: 95, align: 'center' });
        }

        const makeCell = (
            r: number,
            c: number,
            width: number,
            overrides: Partial<GridCell> = {}
        ): GridCell => ({
            id: `cell_gen_${Date.now()}_${r}_${c}_${Math.random().toString(36).slice(2, 6)}`,
            row: r,
            col: c,
            value: '',
            type: 'label',
            width,
            height: 28,
            align: 'center',
            verticalAlign: 'middle',
            fontSize: 11,
            borders: { top: true, right: true, bottom: true, left: true },
            ...overrides
        });

        const rows: GridCell[][] = [];
        const generatedKeys: string[] = [];

        // 1. Header Row
        const headerRow = cols.map((col, cIdx) =>
            makeCell(0, cIdx, col.width, {
                value: col.header,
                bold: true,
                align: 'center',
                backgroundColor: '#f3f4f6',
                height: 32
            })
        );
        rows.push(headerRow);

        // 2. Subject Rows
        chosenMapels.forEach((mp, idx) => {
            const key = generateSubjectKeyFromName(mp, usedKeys);
            generatedKeys.push(`$${key}`);
            const rIdx = rows.length;

            const rowCells = cols.map((col, cIdx) => {
                if (col.id === 'no') {
                    return makeCell(rIdx, cIdx, col.width, {
                        value: String(idx + 1),
                        align: 'center'
                    });
                }
                if (col.id === 'mapel') {
                    return makeCell(rIdx, cIdx, col.width, {
                        value: mp.nama,
                        align: 'left'
                    });
                }
                if (col.id === 'kkm') {
                    return makeCell(rIdx, cIdx, col.width, {
                        value: String(mp.kkm ?? 70),
                        align: 'center'
                    });
                }
                if (col.id === 'nilai') {
                    return makeCell(rIdx, cIdx, col.width, {
                        type: 'input',
                        key,
                        value: '',
                        align: 'center',
                        bold: true
                    });
                }
                if (col.id === 'rerata_kelas') {
                    return makeCell(rIdx, cIdx, col.width, {
                        type: 'formula',
                        value: `=RATA2_KELAS($${key})`,
                        align: 'center'
                    });
                }
                if (col.id === 'extra') {
                    return makeCell(rIdx, cIdx, col.width, {
                        type: 'formula',
                        value: extraScoreFormat === 'arab' ? `=ARAB($${key})` : `=TERBILANG($${key})`,
                        align: extraScoreFormat === 'arab' ? 'center' : 'left'
                    });
                }
                if (col.id === 'predikat') {
                    return makeCell(rIdx, cIdx, col.width, {
                        type: 'formula',
                        value: predikatMode === 'pesantren' ? `=PREDIKAT($${key}, "pesantren")` : `=PREDIKAT($${key})`,
                        align: 'center'
                    });
                }
                return makeCell(rIdx, cIdx, col.width);
            });

            rows.push(rowCells);
        });

        const nilaiColIdx = cols.findIndex(c => c.id === 'nilai');
        const labelSpanCount = Math.max(1, nilaiColIdx);
        const argsList = generatedKeys.join(', ');

        const appendSummaryRow = (
            label: string,
            formulaExpr: string,
            extraFormula?: string,
            predikatFormula?: string,
            classAvgFormula?: string
        ) => {
            const rIdx = rows.length;
            const rowCells: GridCell[] = [];
            for (let cIdx = 0; cIdx < cols.length; cIdx++) {
                const col = cols[cIdx];
                if (cIdx === 0) {
                    rowCells.push(
                        makeCell(rIdx, cIdx, col.width, {
                            value: label,
                            bold: true,
                            align: 'left',
                            colSpan: labelSpanCount,
                            backgroundColor: '#f8fafc'
                        })
                    );
                } else if (cIdx < labelSpanCount) {
                    rowCells.push(
                        makeCell(rIdx, cIdx, col.width, {
                            hidden: true,
                            value: ''
                        })
                    );
                } else if (col.id === 'nilai') {
                    rowCells.push(
                        makeCell(rIdx, cIdx, col.width, {
                            type: formulaExpr.startsWith('=') ? 'formula' : 'data',
                            value: formulaExpr,
                            bold: true,
                            align: 'center',
                            backgroundColor: '#f8fafc'
                        })
                    );
                } else if (col.id === 'rerata_kelas') {
                    rowCells.push(
                        makeCell(rIdx, cIdx, col.width, {
                            type: classAvgFormula ? 'formula' : 'label',
                            value: classAvgFormula || '',
                            bold: Boolean(classAvgFormula),
                            align: 'center',
                            backgroundColor: '#f8fafc'
                        })
                    );
                } else if (col.id === 'extra') {
                    rowCells.push(
                        makeCell(rIdx, cIdx, col.width, {
                            type: extraFormula ? 'formula' : 'label',
                            value: extraFormula || '',
                            bold: Boolean(extraFormula),
                            align: extraScoreFormat === 'arab' ? 'center' : 'left',
                            backgroundColor: '#f8fafc'
                        })
                    );
                } else if (col.id === 'predikat') {
                    rowCells.push(
                        makeCell(rIdx, cIdx, col.width, {
                            type: predikatFormula ? 'formula' : 'label',
                            value: predikatFormula || '',
                            bold: Boolean(predikatFormula),
                            align: 'center',
                            backgroundColor: '#f8fafc'
                        })
                    );
                } else {
                    rowCells.push(makeCell(rIdx, cIdx, col.width, { backgroundColor: '#f8fafc' }));
                }
            }
            rows.push(rowCells);
        };

        if (includeTotalRow) {
            const sumFormula = `=SUM(${argsList})`;
            const extraF = extraScoreFormat === 'arab'
                ? `=ARAB(SUM(${argsList}))`
                : extraScoreFormat === 'terbilang'
                ? `=TERBILANG(SUM(${argsList}))`
                : undefined;
            appendSummaryRow('JUMLAH NILAI', sumFormula, extraF);
        }

        if (includeAvgRow) {
            const avgFormula = `=RATA2(${argsList})`;
            const extraF = extraScoreFormat === 'arab'
                ? `=ARAB(RATA2(${argsList}))`
                : extraScoreFormat === 'terbilang'
                ? `=TERBILANG(RATA2(${argsList}))`
                : undefined;
            const predF = predikatMode === 'pesantren'
                ? `=PREDIKAT(RATA2(${argsList}), "pesantren")`
                : predikatMode === 'huruf'
                ? `=PREDIKAT(RATA2(${argsList}))`
                : undefined;
            const classAvgF = includeClassAvg ? '=RATA2_KELAS()' : undefined;
            appendSummaryRow('RATA-RATA NILAI', avgFormula, extraF, predF, classAvgF);
        }

        if (includeRankRow) {
            appendSummaryRow('PERINGKAT KELAS', '$PERINGKAT');
        }

        onGenerateRows(
            rows,
            insertMode,
            cols.map(c => c.width)
        );
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                            <i className="bi bi-journal-check text-lg"></i>
                        </div>
                        <div>
                            <h3 className="font-black text-sm sm:text-base">Generate Tabel Mapel dari Kurikulum</h3>
                            <p className="text-[11px] text-slate-300">
                                Susun baris mata pelajaran, kode $KEY, KKM, rumus predikat &amp; rata-rata dalam 1 klik
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {/* Filter Jenjang & Rumpun */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                Pilih Marhalah / Jenjang
                            </label>
                            <select
                                value={selectedJenjangId}
                                onChange={e => setSelectedJenjangId(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                            >
                                <option value={0}>Semua Jenjang ({settings.mataPelajaran.length} Mapel)</option>
                                {settings.jenjang.map(j => (
                                    <option key={j.id} value={j.id}>
                                        {j.nama}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                Filter Rumpun Mapel
                            </label>
                            <select
                                value={rumpunFilter}
                                onChange={e => setRumpunFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                            >
                                <option value="all">Semua Rumpun</option>
                                <option value="Diniyah">Diniyah / Kitab</option>
                                <option value="Umum">Umum</option>
                                <option value="Bahasa">Bahasa</option>
                                <option value="Tahfizh">Tahfizh / Al-Qur&apos;an</option>
                                <option value="Muatan Lokal">Muatan Lokal</option>
                            </select>
                        </div>
                    </div>

                    {/* Daftar Mata Pelajaran */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">
                                Mata Pelajaran Terpilih ({selectedMapelIds.size} dari {mapelForJenjang.length})
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedMapelIds(new Set(mapelForJenjang.map(m => m.id)))}
                                    className="text-teal-700 hover:underline font-bold text-[11px]"
                                >
                                    Pilih Semua
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMapelIds(new Set())}
                                    className="text-slate-500 hover:text-rose-600 font-bold text-[11px]"
                                >
                                    Kosongkan
                                </button>
                            </div>
                        </div>

                        {mapelForJenjang.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-500 italic bg-white">
                                Belum ada mata pelajaran pada jenjang/rumpun ini di Data Master Kurikulum.
                            </div>
                        ) : (
                            <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2">
                                {mapelForJenjang.map(mp => {
                                    const checked = selectedMapelIds.has(mp.id);
                                    return (
                                        <label
                                            key={mp.id}
                                            className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer text-xs transition-colors ${
                                                checked ? 'bg-teal-50/40' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleMapel(mp.id)}
                                                    className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                                />
                                                <span className="font-semibold text-slate-800 truncate">{mp.nama}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                                KKM {mp.kkm ?? 70}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Konfigurasi Kolom & Rumus Otomatis */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <i className="bi bi-layout-three-columns text-teal-600"></i>
                                <span>Struktur Kolom Tabel</span>
                            </div>

                            <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                                <span>Tampilkan Kolom KKM</span>
                                <input
                                    type="checkbox"
                                    checked={includeKkm}
                                    onChange={e => setIncludeKkm(e.target.checked)}
                                    className="rounded text-teal-600 w-4 h-4"
                                />
                            </label>

                            <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                                <span>Tampilkan Kolom Rerata Kelas (<code>=RATA2_KELAS</code>)</span>
                                <input
                                    type="checkbox"
                                    checked={includeClassAvg}
                                    onChange={e => setIncludeClassAvg(e.target.checked)}
                                    className="rounded text-teal-600 w-4 h-4"
                                />
                            </label>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Kolom Konversi Nilai Otomatis
                                </label>
                                <select
                                    value={extraScoreFormat}
                                    onChange={e => setExtraScoreFormat(e.target.value as any)}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white"
                                >
                                    <option value="terbilang">Huruf Terbilang (=TERBILANG)</option>
                                    <option value="arab">Angka Arab (=ARAB)</option>
                                    <option value="none">Tanpa Kolom Konversi</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Kolom Predikat Otomatis
                                </label>
                                <select
                                    value={predikatMode}
                                    onChange={e => setPredikatMode(e.target.value as any)}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white"
                                >
                                    <option value="huruf">Huruf A, B, C, D (=PREDIKAT)</option>
                                    <option value="pesantren">Taqdir Pesantren (Mumtaz - Rasib)</option>
                                    <option value="none">Tanpa Kolom Predikat</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <i className="bi bi-calculator text-indigo-600"></i>
                                <span>Baris Rekap &amp; Posisi Sisip</span>
                            </div>

                            <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                                <span>Baris Jumlah Nilai (<code>=SUM</code>)</span>
                                <input
                                    type="checkbox"
                                    checked={includeTotalRow}
                                    onChange={e => setIncludeTotalRow(e.target.checked)}
                                    className="rounded text-teal-600 w-4 h-4"
                                />
                            </label>

                            <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                                <span>Baris Rata-Rata (<code>=RATA2</code>)</span>
                                <input
                                    type="checkbox"
                                    checked={includeAvgRow}
                                    onChange={e => setIncludeAvgRow(e.target.checked)}
                                    className="rounded text-teal-600 w-4 h-4"
                                />
                            </label>

                            <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                                <span>Baris Peringkat Kelas (<code>$PERINGKAT</code>)</span>
                                <input
                                    type="checkbox"
                                    checked={includeRankRow}
                                    onChange={e => setIncludeRankRow(e.target.checked)}
                                    className="rounded text-teal-600 w-4 h-4"
                                />
                            </label>

                            <div className="pt-1 border-t border-slate-200">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Cara Penempatan ke Kanvas
                                </label>
                                <select
                                    value={insertMode}
                                    onChange={e => setInsertMode(e.target.value as any)}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white"
                                >
                                    <option value="insert_below">
                                        Sisipkan mulai Baris #{activeRowIndex + 1} (Pertahankan isi atas)
                                    </option>
                                    <option value="replace_sheet">
                                        Ganti seluruh isi lembar aktif dengan tabel ini
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <span className="text-xs text-slate-500">
                        Setiap mapel otomatis dibuatkan sel input <code className="font-bold text-teal-700">$KODE</code> siap isi di Wali Kelas
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            disabled={selectedMapelIds.size === 0}
                            onClick={handleBuildAndApply}
                            className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-40 transition-all flex items-center gap-1.5"
                        >
                            <i className="bi bi-lightning-charge-fill"></i>
                            <span>Buat Tabel ({selectedMapelIds.size} Mapel)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
