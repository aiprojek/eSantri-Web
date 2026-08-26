import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { TahfizhRecord, Santri } from '../../types';
import { QURAN_DATA, getJuzForSurah, getSurahByName } from '../../data/quran';
import { calculateTahfizhSmartScore } from '../../utils/tahfizhScoring';

interface BatchRowItem {
    santriId: number;
    santriName: string;
    nis: string;
    status: 'Setor' | 'Izin' | 'Sakit' | 'Alpha' | 'Belum';
    tipe: TahfizhRecord['tipe'];
    juz: number;
    surahIndex: number;
    ayatAwal: number;
    ayatAkhir: number;
    predikat: TahfizhRecord['predikat'];
    catatan: string;
    jumlahTeguran: number;
    jumlahKesalahan: number;
    rincianKesalahan: string;
}

export const TahfizhBatchHalaqahInput: React.FC = () => {
    const { settings, showToast, currentUser } = useAppContext();
    const { santriList, tahfizhList, onSaveTahfizh } = useSantriContext();

    const [selectedHalaqahId, setSelectedHalaqahId] = useState<number>(settings.kelompokHalaqah?.[0]?.id || 0);
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    // Filter santri based on halaqah or rombel
    const eligibleSantri = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            if (selectedHalaqahId > 0) {
                return s.halaqahId === selectedHalaqahId;
            }
            if (selectedRombelId > 0) {
                return s.rombelId === selectedRombelId;
            }
            return true;
        }).sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [santriList, selectedHalaqahId, selectedRombelId]);

    // Initialize rows for eligible santri
    const [rows, setRows] = useState<BatchRowItem[]>([]);

    // Reset rows whenever the filter changes
    React.useEffect(() => {
        const initialRows: BatchRowItem[] = eligibleSantri.map(santri => {
            // Find latest record to smart prefill
            const santriRecords = tahfizhList.filter(r => r.santriId === santri.id);
            const latest = santriRecords.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];

            let surahIdx = 77; // An-Naba
            let initialJuz = 30;
            let startAyat = 1;
            let endAyat = 5;

            if (latest) {
                const foundSurah = QURAN_DATA.findIndex(s => s.name === latest.surah);
                if (foundSurah >= 0) {
                    surahIdx = foundSurah;
                    const surahData = QURAN_DATA[foundSurah];
                    if (latest.ayatAkhir < surahData.ayat) {
                        startAyat = latest.ayatAkhir + 1;
                        endAyat = Math.min(surahData.ayat, startAyat + 4);
                    } else if (foundSurah < 113) {
                        surahIdx = foundSurah + 1;
                        startAyat = 1;
                        endAyat = Math.min(QURAN_DATA[foundSurah + 1].ayat, 5);
                    }
                    initialJuz = getJuzForSurah(QURAN_DATA[surahIdx].number, startAyat);
                }
            }

            return {
                santriId: santri.id,
                santriName: santri.namaLengkap,
                nis: santri.nis,
                status: 'Setor',
                tipe: 'Ziyadah',
                juz: initialJuz,
                surahIndex: surahIdx,
                ayatAwal: startAyat,
                ayatAkhir: endAyat,
                predikat: 'Lancar',
                catatan: '',
                jumlahTeguran: 0,
                jumlahKesalahan: 0,
                rincianKesalahan: '',
            };
        });
        setRows(initialRows);
    }, [eligibleSantri, tahfizhList]);

    const updateRow = (index: number, patch: Partial<BatchRowItem>) => {
        setRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const handleSurahChange = (index: number, newSurahIdx: number) => {
        const surah = QURAN_DATA[newSurahIdx];
        const autoJuz = getJuzForSurah(surah.number, 1);
        updateRow(index, {
            surahIndex: newSurahIdx,
            juz: autoJuz,
            ayatAwal: 1,
            ayatAkhir: Math.min(surah.ayat, 5)
        });
    };

    const handleApplyAllType = (tipe: TahfizhRecord['tipe']) => {
        setRows(prev => prev.map(r => ({ ...r, tipe })));
        showToast(`Semua santri diatur ke tipe: ${tipe}`, 'info');
    };

    const handleApplyAllPredikat = (predikat: TahfizhRecord['predikat']) => {
        setRows(prev => prev.map(r => ({ ...r, predikat })));
        showToast(`Semua santri diatur ke predikat: ${predikat}`, 'info');
    };

    const handleSaveAll = async () => {
        const rowsToSave = rows.filter(r => r.status === 'Setor');
        if (rowsToSave.length === 0) {
            showToast('Tidak ada santri dengan status Setor.', 'info');
            return;
        }

        setIsSaving(true);
        try {
            let savedCount = 0;
            for (const r of rowsToSave) {
                const surahData = QURAN_DATA[r.surahIndex];
                const smart = calculateTahfizhSmartScore({
                    surahNumber: surahData.number,
                    surahName: surahData.name,
                    ayatAwal: r.ayatAwal,
                    ayatAkhir: r.ayatAkhir,
                    totalSurahAyat: surahData.ayat,
                    jumlahTeguran: r.jumlahTeguran,
                    jumlahKesalahan: r.jumlahKesalahan
                });

                const newRecord: TahfizhRecord = {
                    id: Date.now() + Math.floor(Math.random() * 10000),
                    santriId: r.santriId,
                    tanggal,
                    tipe: r.tipe,
                    juz: r.juz,
                    surah: surahData.name,
                    ayatAwal: r.ayatAwal,
                    ayatAkhir: r.ayatAkhir,
                    predikat: r.predikat,
                    nilaiAngka: smart.score,
                    catatan: r.catatan.trim() || undefined,
                    jumlahTeguran: r.jumlahTeguran > 0 ? r.jumlahTeguran : undefined,
                    jumlahKesalahan: r.jumlahKesalahan > 0 ? r.jumlahKesalahan : undefined,
                    rincianKesalahan: r.rincianKesalahan.trim() || undefined,
                    muhaffizhId: currentUser?.id,
                    halaqahId: selectedHalaqahId || undefined,
                };
                await onSaveTahfizh(newRecord);
                savedCount++;
            }
            showToast(`Berhasil menyimpan ${savedCount} setoran halaqah!`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Gagal menyimpan setoran massal.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendWhatsApp = (row: BatchRowItem) => {
        const santri = santriList.find(s => s.id === row.santriId);
        const phone = santri?.teleponWali || santri?.telepon;
        if (!phone) {
            showToast(`Nomor WA untuk ${row.santriName} belum diisi.`, 'error');
            return;
        }

        const surahData = QURAN_DATA[row.surahIndex];
        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
        let detailEvaluasi = '';
        if (row.jumlahTeguran > 0 || row.jumlahKesalahan > 0 || row.rincianKesalahan.trim()) {
            detailEvaluasi = `• *Evaluasi Setoran*: ${row.jumlahTeguran}x Teguran (Tawaqquf), ${row.jumlahKesalahan}x Kesalahan\n`;
            if (row.rincianKesalahan.trim()) {
                detailEvaluasi += `• *Rincian Koreksi*: ${row.rincianKesalahan.trim()}\n`;
            }
        }

        const pesan = `*LAPORAN TAHFIZH SANTRI*\n` +
            `Assalamu'alaikum Wr. Wb.\n\n` +
            `Yth. Wali dari *${santri.namaLengkap}* (NIS: ${santri.nis})\n\n` +
            `Alhamdulillah, hari ini (${tanggal}) ananda telah menyetorkan hafalan:\n` +
            `• *Jenis*: ${row.tipe}\n` +
            `• *Capaian*: Juz ${row.juz}, QS. ${surahData.name} (Ayat ${row.ayatAwal} - ${row.ayatAkhir})\n` +
            `• *Predikat*: ${row.predikat}\n` +
            detailEvaluasi +
            (row.catatan ? `• *Catatan Pembimbing*: ${row.catatan}\n\n` : `\n`) +
            `Semoga ananda istiqomah dalam menghafal dan mengamalkan Al-Qur'an.\n\n` +
            `_${settings.namaPonpes}_`;

        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`, '_blank');
    };

    return (
        <div className="space-y-4">
            {/* Header Control Panel */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <i className="bi bi-table text-teal-600"></i> Mode Cepat Halaqah & Setoran Massal
                        </h3>
                        <p className="text-xs text-gray-500">
                            Catat mutaba'ah harian seluruh santri halaqah dalam satu layar tabel interaktif.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={isSaving || rows.length === 0}
                            className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 active:scale-95 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            <i className={`bi ${isSaving ? 'bi-arrow-repeat animate-spin' : 'bi-check-all'}`}></i>
                            <span>{isSaving ? 'Menyimpan...' : `Simpan Semua Setoran (${rows.filter(r => r.status === 'Setor').length})`}</span>
                        </button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">
                            Kelompok Halaqah
                        </label>
                        <select
                            value={selectedHalaqahId}
                            onChange={(e) => {
                                setSelectedHalaqahId(Number(e.target.value));
                                if (Number(e.target.value) > 0) setSelectedRombelId(0);
                            }}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500"
                        >
                            <option value={0}>-- Pilih Kelompok Halaqah --</option>
                            {(settings.kelompokHalaqah || []).map(h => (
                                <option key={h.id} value={h.id}>{h.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">
                            Atau Filter Rombel Formal
                        </label>
                        <select
                            value={selectedRombelId}
                            onChange={(e) => {
                                setSelectedRombelId(Number(e.target.value));
                                if (Number(e.target.value) > 0) setSelectedHalaqahId(0);
                            }}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500"
                        >
                            <option value={0}>Semua Rombel</option>
                            {settings.rombel.map(r => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">
                            Tanggal Sesi Halaqah
                        </label>
                        <input
                            type="date"
                            value={tanggal}
                            onChange={(e) => setTanggal(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                {/* Quick Batch Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-500 font-medium">Set Tipe Semua:</span>
                        {(['Ziyadah', 'Murojaah', "Tasmi'", 'Ujian Hafalan'] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => handleApplyAllType(t)}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-teal-50 hover:text-teal-700 text-gray-700 rounded-lg font-semibold border border-gray-200"
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-500 font-medium">Set Predikat Semua:</span>
                        {(['Sangat Lancar', 'Lancar', 'Kurang Lancar'] as const).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => handleApplyAllPredikat(p)}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg font-semibold border border-gray-200"
                            >
                                {p === 'Sangat Lancar' ? 'Mumtaz (A)' : p === 'Lancar' ? 'Jayyid (B)' : 'Maqbul (C)'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
                            <tr>
                                <th className="p-3 w-12 text-center">No</th>
                                <th className="p-3 min-w-[180px]">Nama Santri</th>
                                <th className="p-3 min-w-[100px]">Kehadiran</th>
                                <th className="p-3 min-w-[120px]">Jenis Setoran</th>
                                <th className="p-3 min-w-[80px]">Juz</th>
                                <th className="p-3 min-w-[160px]">Surah</th>
                                <th className="p-3 min-w-[140px]">Ayat (Awal - Akhir)</th>
                                <th className="p-3 min-w-[130px]">Predikat</th>
                                <th className="p-3 min-w-[130px]">Teguran & Salah</th>
                                <th className="p-3 min-w-[180px]">Catatan Pembimbing</th>
                                <th className="p-3 w-16 text-center">WA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map((row, idx) => {
                                const surahData = QURAN_DATA[row.surahIndex] || QURAN_DATA[0];
                                const isAbsen = row.status !== 'Setor';

                                return (
                                    <tr key={row.santriId} className={`hover:bg-gray-50/80 transition-colors ${isAbsen ? 'bg-gray-50/50 opacity-60' : ''}`}>
                                        <td className="p-3 text-center text-xs text-gray-400 font-mono">
                                            {idx + 1}
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-gray-800 text-xs sm:text-sm truncate">
                                                {row.santriName}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono">
                                                NIS: {row.nis}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <select
                                                value={row.status}
                                                onChange={(e) => updateRow(idx, { status: e.target.value as any })}
                                                className={`p-1.5 rounded-lg text-xs font-bold border ${
                                                    row.status === 'Setor' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    row.status === 'Izin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    row.status === 'Sakit' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                                }`}
                                            >
                                                <option value="Setor">Setor</option>
                                                <option value="Izin">Izin</option>
                                                <option value="Sakit">Sakit</option>
                                                <option value="Alpha">Alpha</option>
                                                <option value="Belum">Belum</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <select
                                                disabled={isAbsen}
                                                value={row.tipe}
                                                onChange={(e) => updateRow(idx, { tipe: e.target.value as any })}
                                                className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                                            >
                                                <option value="Ziyadah">Ziyadah</option>
                                                <option value="Murojaah">Murojaah</option>
                                                <option value="Tasmi'">Tasmi'</option>
                                                <option value="Ujian Hafalan">Ujian</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <select
                                                disabled={isAbsen}
                                                value={row.juz}
                                                onChange={(e) => updateRow(idx, { juz: Number(e.target.value) })}
                                                className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-teal-800 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                                            >
                                                {Array.from({ length: 30 }, (_, i) => 30 - i).map(j => (
                                                    <option key={j} value={j}>Juz {j}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <select
                                                disabled={isAbsen}
                                                value={row.surahIndex}
                                                onChange={(e) => handleSurahChange(idx, Number(e.target.value))}
                                                className="w-full p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                                            >
                                                {QURAN_DATA.map((s, sIdx) => (
                                                    <option key={sIdx} value={sIdx}>{s.number}. {s.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    disabled={isAbsen}
                                                    type="number"
                                                    min={1}
                                                    max={surahData.ayat}
                                                    value={row.ayatAwal}
                                                    onChange={(e) => updateRow(idx, { ayatAwal: Math.max(1, Number(e.target.value)) })}
                                                    className="w-12 p-1 border border-gray-300 rounded text-center text-xs font-bold disabled:bg-gray-100"
                                                />
                                                <span className="text-gray-400 text-xs">-</span>
                                                <input
                                                    disabled={isAbsen}
                                                    type="number"
                                                    min={row.ayatAwal}
                                                    max={surahData.ayat}
                                                    value={row.ayatAkhir}
                                                    onChange={(e) => updateRow(idx, { ayatAkhir: Math.min(surahData.ayat, Number(e.target.value)) })}
                                                    className="w-12 p-1 border border-gray-300 rounded text-center text-xs font-bold disabled:bg-gray-100"
                                                />
                                                <span className="text-[10px] text-gray-400">/{surahData.ayat}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <select
                                                disabled={isAbsen}
                                                value={row.predikat}
                                                onChange={(e) => updateRow(idx, { predikat: e.target.value as any })}
                                                className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                                            >
                                                <option value="Sangat Lancar">Mumtaz (A)</option>
                                                <option value="Lancar">Jayyid (B)</option>
                                                <option value="Kurang Lancar">Maqbul (C)</option>
                                                <option value="Belum Lulus">Rosib (D)</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <div className="flex items-center bg-amber-50 border border-amber-200 rounded-lg px-1 py-0.5" title="Teguran / Tawaqquf">
                                                    <span className="text-[10px] text-amber-700 font-bold mr-1">⚠️</span>
                                                    <button
                                                        type="button"
                                                        disabled={isAbsen}
                                                        onClick={() => updateRow(idx, { jumlahTeguran: Math.max(0, row.jumlahTeguran - 1) })}
                                                        className="text-[10px] px-1 text-amber-700 hover:bg-amber-100 rounded disabled:opacity-50"
                                                    >-</button>
                                                    <span className="text-xs font-bold text-amber-900 w-4 text-center">{row.jumlahTeguran}</span>
                                                    <button
                                                        type="button"
                                                        disabled={isAbsen}
                                                        onClick={() => updateRow(idx, { jumlahTeguran: row.jumlahTeguran + 1 })}
                                                        className="text-[10px] px-1 text-amber-700 hover:bg-amber-100 rounded disabled:opacity-50 font-bold"
                                                    >+</button>
                                                </div>
                                                <div className="flex items-center bg-rose-50 border border-rose-200 rounded-lg px-1 py-0.5" title="Kesalahan Tajwid/Huruf">
                                                    <span className="text-[10px] text-rose-700 font-bold mr-1">❌</span>
                                                    <button
                                                        type="button"
                                                        disabled={isAbsen}
                                                        onClick={() => updateRow(idx, { jumlahKesalahan: Math.max(0, row.jumlahKesalahan - 1) })}
                                                        className="text-[10px] px-1 text-rose-700 hover:bg-rose-100 rounded disabled:opacity-50"
                                                    >-</button>
                                                    <span className="text-xs font-bold text-rose-900 w-4 text-center">{row.jumlahKesalahan}</span>
                                                    <button
                                                        type="button"
                                                        disabled={isAbsen}
                                                        onClick={() => updateRow(idx, { jumlahKesalahan: row.jumlahKesalahan + 1 })}
                                                        className="text-[10px] px-1 text-rose-700 hover:bg-rose-100 rounded disabled:opacity-50 font-bold"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                disabled={isAbsen}
                                                type="text"
                                                placeholder="Catatan koreksi / tajwid..."
                                                value={row.catatan}
                                                onChange={(e) => updateRow(idx, { catatan: e.target.value })}
                                                className="w-full p-1.5 border border-gray-300 rounded-lg text-xs disabled:bg-gray-100"
                                            />
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleSendWhatsApp(row)}
                                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center text-sm border border-emerald-200"
                                                title="Kirim Laporan WA ke Wali"
                                            >
                                                <i className="bi bi-whatsapp"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {rows.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                        <i className="bi bi-people text-3xl mb-2 block opacity-40"></i>
                        Tidak ada santri aktif dalam kelompok/rombel yang dipilih.
                    </div>
                )}
            </div>
        </div>
    );
};
